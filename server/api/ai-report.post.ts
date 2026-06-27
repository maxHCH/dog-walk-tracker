import Anthropic from '@anthropic-ai/sdk'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

// AI 健康週報（Phase 3）— server-only。
// 撈近 7 天散步＋便便，丟給 Claude 產生結構化健康觀察，寫入 ai_reports。
// API key 只在 server 端使用（runtimeConfig.anthropicApiKey），不外洩到 client。
// 結構化輸出用 forced tool use（相容 @anthropic-ai/sdk 0.39）。

const CONSISTENCY_LABEL: Record<string, string> = {
  normal: '正常', soft: '軟便', loose: '稀水', hard: '偏硬',
}
const COLOR_LABEL: Record<string, string> = {
  brown: '棕色', yellow: '黃色', black: '黑色', red: '帶血',
}

function localDate(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default defineEventHandler(async (event) => {
  // serverSupabaseUser 在無 session 時會 throw，轉成乾淨的 401
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user) throw createError({ statusCode: 401, statusMessage: '尚未登入' })

  const config = useRuntimeConfig()
  if (!config.anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: '伺服器未設定 ANTHROPIC_API_KEY' })
  }

  const supabase = await serverSupabaseClient(event)

  // 近 7 天範圍
  const since = new Date()
  since.setDate(since.getDate() - 6)
  since.setHours(0, 0, 0, 0)
  const sinceIso = since.toISOString()
  const periodStart = localDate(sinceIso)
  const periodEnd = localDate(new Date().toISOString())

  const [walksRes, poopsRes, dogRes] = await Promise.all([
    supabase.from('walk_sessions').select('started_at,duration_sec,distance_m')
      .gte('started_at', sinceIso).not('ended_at', 'is', null),
    supabase.from('poop_logs').select('logged_at,consistency,color,note').gte('logged_at', sinceIso),
    supabase.from('dogs').select('name,gender,birth_year').eq('user_id', user.id).maybeSingle(),
  ])
  if (walksRes.error) throw createError({ statusCode: 500, statusMessage: walksRes.error.message })
  if (poopsRes.error) throw createError({ statusCode: 500, statusMessage: poopsRes.error.message })

  const walks = (walksRes.data ?? []) as { started_at: string; duration_sec: number | null }[]
  const poops = (poopsRes.data ?? []) as { logged_at: string; consistency: string; color: string; note: string | null }[]
  const dog = dogRes.data as { name: string; gender: string | null; birth_year: number | null } | null

  // 資料不足 → 不亂分析，請使用者多記幾天
  const daysWithData = new Set([
    ...walks.map((w) => localDate(w.started_at)),
    ...poops.map((p) => localDate(p.logged_at)),
  ]).size
  if (daysWithData < 2 || walks.length + poops.length < 3) {
    return { status: 'insufficient', daysWithData, recordCount: walks.length + poops.length }
  }

  // 彙整
  const isAbnormal = (p: { consistency: string; color: string }) =>
    p.consistency !== 'normal' || p.color !== 'brown'
  const isCritical = (p: { color: string }) => p.color === 'black' || p.color === 'red'

  const perDay = new Map<string, { walks: number; durationMin: number; poops: number; abnormalPoops: number }>()
  const ensure = (k: string) => {
    let d = perDay.get(k)
    if (!d) { d = { walks: 0, durationMin: 0, poops: 0, abnormalPoops: 0 }; perDay.set(k, d) }
    return d
  }
  for (const w of walks) {
    const d = ensure(localDate(w.started_at))
    d.walks++
    d.durationMin += Math.round((w.duration_sec ?? 0) / 60)
  }
  for (const p of poops) {
    const d = ensure(localDate(p.logged_at))
    d.poops++
    if (isAbnormal(p)) d.abnormalPoops++
  }

  const payload = {
    dog: {
      name: dog?.name ?? '狗狗',
      gender: dog?.gender === 'male' ? '公' : dog?.gender === 'female' ? '母' : '未知',
      ageYears: dog?.birth_year ? new Date().getFullYear() - dog.birth_year : null,
    },
    period: { start: periodStart, end: periodEnd, days: 7 },
    totals: {
      walks: walks.length,
      totalDurationMin: walks.reduce((s, w) => s + Math.round((w.duration_sec ?? 0) / 60), 0),
      poops: poops.length,
      abnormalPoops: poops.filter(isAbnormal).length,
      criticalPoops: poops.filter(isCritical).length,
    },
    perDay: [...perDay.entries()].sort().map(([date, v]) => ({ date, ...v })),
    poops: poops
      .slice()
      .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
      .map((p) => ({
        date: localDate(p.logged_at),
        consistency: CONSISTENCY_LABEL[p.consistency] ?? p.consistency,
        color: COLOR_LABEL[p.color] ?? p.color,
        abnormal: isAbnormal(p),
        critical: isCritical(p),
        note: p.note || undefined,
      })),
  }

  const system = [
    '你是一位謹慎、溫和的寵物健康助理，協助狗主人理解最近 7 天的散步與排便狀況。',
    '你不是獸醫，不做診斷，只提供觀察與一般照護建議。原則：',
    '- 一律用繁體中文，語氣親切、白話、具體，避免醫學術語堆疊。',
    '- 只依據提供的資料說話，絕不編造沒有的數據或症狀。',
    '- 便便性狀異常（軟便/稀水/偏硬）或顏色異常（黃/黑/帶血）要溫和指出。',
    '- 黑色或帶血便屬警訊：請建議盡快就醫，並把 vet_recommended 設為 true。',
    '- 散步活動量明顯偏少時溫和提醒增加，但不要過度恐嚇。',
    '- 若整體看起來健康，就給正向肯定，不要硬找問題。',
    '務必只透過 health_report 工具回覆。',
  ].join('\n')

  const tool: Anthropic.Tool = {
    name: 'health_report',
    description: '產生狗狗近 7 天的健康觀察報告',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '整體健康摘要，2–3 句白話繁中' },
        poop_assessment: { type: 'string', description: '便便趨勢與性狀/顏色觀察' },
        activity_assessment: { type: 'string', description: '散步活動量觀察' },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          description: '1–4 條具體可執行的照護建議',
        },
        anomaly: { type: 'boolean', description: '是否有需要注意的異常狀況' },
        vet_recommended: { type: 'boolean', description: '是否建議就醫（黑便/血便等警訊為 true）' },
      },
      required: ['summary', 'poop_assessment', 'activity_assessment', 'suggestions', 'anomaly', 'vet_recommended'],
    },
  }

  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
  let report: Record<string, unknown>
  try {
    const msg = await anthropic.messages.create({
      model: config.anthropicModel,
      max_tokens: 1500,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'health_report' },
      messages: [{ role: 'user', content: `以下是近 7 天資料（JSON）：\n${JSON.stringify(payload)}` }],
    })
    const block = msg.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') throw new Error('模型未回傳結構化結果')
    report = block.input as Record<string, unknown>
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `AI 產生失敗：${e?.message ?? '未知錯誤'}` })
  }

  // 寫入快取（保留歷史；前端讀最新一筆）
  const anomalyFlag = !!(report.anomaly || report.vet_recommended)
  const { error: insertErr } = await supabase.from('ai_reports').insert({
    user_id: user.id,
    period_start: periodStart,
    period_end: periodEnd,
    summary: String(report.summary ?? ''),
    anomaly_flag: anomalyFlag,
    detail_json: report,
  })
  if (insertErr) throw createError({ statusCode: 500, statusMessage: insertErr.message })

  return { status: 'ok', generatedAt: new Date().toISOString(), report }
})
