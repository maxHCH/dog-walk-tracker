// AI 健康週報 — Supabase Edge Function（跑在 Deno，不是 Node）
//
// 原本是 Nuxt 的 server/api/ai-report.post.ts。搬過來的理由：
// 之後的原生 App 裡沒有 Nuxt 伺服器，但 Supabase 一直都在。
// 搬完之後整個後端只剩 Supabase 一個，前端不管是網頁還是 Swift 都打同一支。
//
// 流程：驗身分 → 檢查訂閱/配額 → 撈近 7 天資料 → 彙整 → 問 Claude → 寫入快取
//
// ANTHROPIC_API_KEY 只存在於 Supabase secrets，永遠不會進到 client。

import Anthropic from 'npm:@anthropic-ai/sdk@0.125.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, fail, json } from '../_shared/cors.ts'
import { checkEntitlement } from './entitlement.ts'
import {
  buildPayload,
  countDaysWithData,
  localDate,
  type DogRow,
  type PoopRow,
  type WalkRow,
} from './aggregate.ts'

// 模型可用 secret 覆寫。預設 claude-sonnet-5：比原本的 sonnet-4-6 新且更便宜
// （$2/$10 vs $3/$15 每百萬 token）。想要更深入的分析就設成 claude-opus-5。
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

const SYSTEM_PROMPT = [
  '你是一位謹慎、溫和的寵物健康助理，協助狗主人理解最近 7 天的散步與排便狀況。',
  '你不是獸醫，不做診斷，只提供觀察與一般照護建議。原則：',
  '- 一律用繁體中文，語氣親切、白話、具體，避免醫學術語堆疊。',
  '- 只依據提供的資料說話，絕不編造沒有的數據或症狀。',
  '- 便便形狀異常（軟便/稀水/偏硬）或顏色異常（黃/黑/帶血）要溫和指出。',
  '- 黑色或帶血便屬警訊：請建議盡快就醫，並把 vet_recommended 設為 true。',
  '- 散步活動量明顯偏少時溫和提醒增加，但不要過度恐嚇。',
  '- 資料含每趟「活力狀態」（活力充沛/正常/累了/不太動）。請併入活動量觀察：',
  '  · 「不太動」（low）代表提不起勁，若連續多趟或多天出現，溫和點出可能的精神/健康變化，建議留意食慾與就醫評估；',
  '  · 偶爾「累了」屬散步後正常，不需緊張；「活力充沛」給正向肯定；',
  '  · 沒有活力資料時不要編造，就以散步時長/次數評估活動量即可。',
  '- 資料含散步當下天氣（溫度、天氣型態）。請結合天氣解讀：',
  '  · 高溫（≥28°C）散步要提醒中暑風險、避開正午、縮短時長、備水、留意柏油燙腳掌；',
  '  · 低溫（≤10°C）或雨雪天提醒保暖防滑、回家擦乾；',
  '  · 若便便異常與某些天氣同時出現，可溫和點出可能關聯（但不過度推論因果）。',
  '- 沒有天氣資料時，weather_assessment 就說明尚未收集到足夠天氣資料即可，不要編造。',
  '- 若整體看起來健康，就給正向肯定，不要硬找問題。',
  '務必只透過 health_report 工具回覆。',
].join('\n')

// 用 forced tool use 拿結構化輸出：規定模型只能透過這個工具回答，
// 回來的 input 就保證是符合 schema 的物件，不用自己 parse 自由文字。
const REPORT_TOOL: Anthropic.Tool = {
  name: 'health_report',
  description: '產生狗狗近 7 天的健康觀察報告',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '整體健康摘要，2–3 句白話繁中' },
      poop_assessment: { type: 'string', description: '便便趨勢與形狀/顏色觀察' },
      activity_assessment: { type: 'string', description: '散步活動量與活力狀態觀察（結合活力充沛/累了/不太動）' },
      weather_assessment: { type: 'string', description: '結合散步天氣（溫度/型態）的觀察與提醒；無天氣資料時說明尚未收集到' },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
        description: '1–4 條具體可執行的照護建議',
      },
      anomaly: { type: 'boolean', description: '是否有需要注意的異常狀況' },
      vet_recommended: { type: 'boolean', description: '是否建議就醫（黑便/血便等警訊為 true）' },
    },
    required: [
      'summary', 'poop_assessment', 'activity_assessment',
      'weather_assessment', 'suggestions', 'anomaly', 'vet_recommended',
    ],
  },
}

Deno.serve(async (req: Request) => {
  // 瀏覽器的 preflight。原生 App 不會走到這裡。
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('僅支援 POST', 405)

  // ---- 1. 驗身分 ----
  // 把呼叫端的 Authorization 原封轉給 supabase client：
  // 之後所有查詢都會以「這位使用者」的身分執行，RLS 自動生效，
  // 不需要也不應該在這裡用 service role key。
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return fail('尚未登入', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return fail('尚未登入', 401)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return fail('伺服器未設定 ANTHROPIC_API_KEY', 500)

  try {
    // ---- 2. 訂閱／配額把關（階段 6 才會真的擋）----
    const gate = await checkEntitlement(supabase)
    if (!gate.allowed) return fail(gate.message, gate.status)

    // ---- 3. 撈近 7 天資料 ----
    const since = new Date()
    since.setDate(since.getDate() - 6)
    since.setHours(0, 0, 0, 0)
    const sinceIso = since.toISOString()
    const periodStart = localDate(sinceIso)
    const periodEnd = localDate(new Date().toISOString())

    const [walksRes, poopsRes, dogRes] = await Promise.all([
      supabase.from('walk_sessions')
        .select('started_at,duration_sec,distance_m,weather_json,energy')
        .gte('started_at', sinceIso).not('ended_at', 'is', null),
      supabase.from('poop_logs')
        .select('logged_at,consistency,color,note').gte('logged_at', sinceIso),
      supabase.from('dogs')
        .select('name,gender,birth_year').eq('user_id', user.id).maybeSingle(),
    ])
    if (walksRes.error) return fail(walksRes.error.message, 500)
    if (poopsRes.error) return fail(poopsRes.error.message, 500)

    const walks = (walksRes.data ?? []) as WalkRow[]
    const poops = (poopsRes.data ?? []) as PoopRow[]
    const dog = (dogRes.data ?? null) as DogRow | null

    // 資料不足 → 不亂分析，也不浪費一次 API 呼叫
    const daysWithData = countDaysWithData(walks, poops)
    const recordCount = walks.length + poops.length
    if (daysWithData < 2 || recordCount < 3) {
      return json({ status: 'insufficient', daysWithData, recordCount })
    }

    // ---- 4. 問 Claude ----
    const payload = buildPayload({ walks, poops, dog, periodStart, periodEnd })
    const anthropic = new Anthropic({ apiKey })

    let report: Record<string, unknown>
    try {
      const msg = await anthropic.messages.create({
        model: MODEL,
        // 給足空間：forced tool use 若在中途被 max_tokens 截斷，
        // 回來的 JSON 會壞掉整份報告就失敗了。實際只按用量計費。
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [REPORT_TOOL],
        tool_choice: { type: 'tool', name: 'health_report' },
        messages: [{
          role: 'user',
          content: `以下是近 7 天資料（JSON）：\n${JSON.stringify(payload)}`,
        }],
      })
      const block = msg.content.find((b) => b.type === 'tool_use')
      if (!block || block.type !== 'tool_use') throw new Error('模型未回傳結構化結果')
      report = block.input as Record<string, unknown>
    } catch (e) {
      const detail = e instanceof Error ? e.message : '未知錯誤'
      return fail(`AI 產生失敗：${detail}`, 502)
    }

    // ---- 5. 寫入快取（保留歷史；前端讀最新一筆）----
    const anomalyFlag = !!(report.anomaly || report.vet_recommended)
    const { error: insertErr } = await supabase.from('ai_reports').insert({
      user_id: user.id,
      period_start: periodStart,
      period_end: periodEnd,
      summary: String(report.summary ?? ''),
      anomaly_flag: anomalyFlag,
      detail_json: report,
    })
    if (insertErr) return fail(insertErr.message, 500)

    return json({ status: 'ok', generatedAt: new Date().toISOString(), report })
  } catch (e) {
    const detail = e instanceof Error ? e.message : '未知錯誤'
    return fail(detail, 500)
  }
})
