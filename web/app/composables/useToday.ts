import type { Database, PoopLog, WalkSession } from '~/types/database'

// 今日摘要（計劃書 §5、首頁 index.vue 用）
// 回傳今天的散步次數、總時長、便便次數與是否有異常便便。

export interface TodaySummary {
  walks: WalkSession[]
  poops: PoopLog[]
  walkCount: number
  totalDurationSec: number
  poopCount: number
  abnormalPoopCount: number
}

function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function useToday() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function fetchToday(): Promise<TodaySummary> {
    const empty: TodaySummary = {
      walks: [], poops: [], walkCount: 0, totalDurationSec: 0, poopCount: 0, abnormalPoopCount: 0,
    }
    if (!user.value) return empty

    const since = startOfTodayIso()
    const [walksRes, poopsRes] = await Promise.all([
      supabase.from('walk_sessions').select('*').gte('started_at', since).order('started_at', { ascending: false }),
      supabase.from('poop_logs').select('*').gte('logged_at', since).order('logged_at', { ascending: false }),
    ])
    if (walksRes.error) throw walksRes.error
    if (poopsRes.error) throw poopsRes.error

    const walks = walksRes.data ?? []
    const poops = poopsRes.data ?? []
    const abnormalPoopCount = poops.filter(
      (p) => p.consistency !== 'normal' || p.color !== 'brown',
    ).length

    return {
      walks,
      poops,
      walkCount: walks.length,
      totalDurationSec: walks.reduce((sum, w) => sum + (w.duration_sec ?? 0), 0),
      poopCount: poops.length,
      abnormalPoopCount,
    }
  }

  return { fetchToday }
}
