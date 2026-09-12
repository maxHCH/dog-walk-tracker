import type { AiReport, Database } from '~/types/database'

// AI 健康週報（Phase 3）client 端：讀最新一份快取 + 觸發產生。
// 實際分析在 Supabase Edge Function `ai-report`（API key 只存在 Supabase secrets）。

export interface HealthReport {
  summary: string
  poop_assessment: string
  activity_assessment: string
  /** 結合散步天氣的觀察（Phase 3.1）；舊報告可能沒有此欄位 */
  weather_assessment?: string
  suggestions: string[]
  anomaly: boolean
  vet_recommended: boolean
}

export type GenerateResult =
  | { status: 'ok'; generatedAt: string; report: HealthReport }
  | { status: 'insufficient'; daysWithData: number; recordCount: number }

/**
 * 取出 Edge Function 的錯誤訊息。
 * functions.invoke() 在非 2xx 時不會 throw，而是回傳 FunctionsHttpError，
 * 真正的訊息在 error.context（原始 Response）的 body 裡，要自己讀出來。
 */
async function readFunctionError(error: unknown): Promise<string> {
  const res = (error as { context?: Response })?.context
  if (res && typeof res.json === 'function') {
    try {
      const body = await res.json()
      if (body?.error) return String(body.error)
    } catch { /* body 不是 JSON，往下用通用訊息 */ }
  }
  return (error as { message?: string })?.message || '產生失敗，請稍後再試'
}

export function useAiReport() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  /** 讀最新一份報告快取 */
  async function fetchLatest(): Promise<AiReport | null> {
    if (!user.value) return null
    const { data, error } = await supabase
      .from('ai_reports')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      console.warn('[useAiReport] 載入失敗：', error.message)
      return null
    }
    return data
  }

  /** 觸發 Edge Function 產生新報告 */
  async function generate(): Promise<GenerateResult> {
    const { data, error } = await supabase.functions.invoke<GenerateResult>('ai-report', {
      method: 'POST',
    })
    if (error) throw new Error(await readFunctionError(error))
    if (!data) throw new Error('產生失敗，請稍後再試')
    return data
  }

  return { fetchLatest, generate }
}
