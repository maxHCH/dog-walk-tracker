import type { AiReport, Database } from '~/types/database'

// AI 健康週報（Phase 3）client 端：讀最新一份快取 + 觸發產生。
// 實際分析在 server route /api/ai-report（API key 不外洩）。

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

  /** 觸發 server 產生新報告 */
  async function generate(): Promise<GenerateResult> {
    return await $fetch<GenerateResult>('/api/ai-report', { method: 'POST' })
  }

  return { fetchLatest, generate }
}
