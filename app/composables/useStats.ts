import type { Consistency, Database, PoopColor } from '~/types/database'
import { CONSISTENCY_OPTIONS, COLOR_OPTIONS } from '~/utils/poop'

// 近 7 天統計：每日散步次數/時長、便便性狀與顏色分布。
// 提供給 /history 頂部的趨勢圖與分布長條圖使用。

export interface DayBar {
  /** YYYY-MM-DD（當地） */
  date: string
  /** 週幾短標籤（一、二…） */
  label: string
  walkCount: number
  durationSec: number
  poopCount: number
}

export interface DistItem<T extends string> {
  value: T
  label: string
  abnormal: boolean
  swatch?: string
  count: number
}

export interface Stats {
  days: DayBar[]
  totalWalks: number
  totalDurationSec: number
  totalPoops: number
  abnormalPoops: number
  consistency: DistItem<Consistency>[]
  color: DistItem<PoopColor>[]
}

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useStats() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function fetchStats(days = 7): Promise<Stats> {
    // 先建好近 days 天的空桶（含沒有資料的日子），確保圖表連續
    const buckets: DayBar[] = []
    const index = new Map<string, DayBar>()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = localDateKey(d)
      const bar: DayBar = { date: key, label: WEEKDAY[d.getDay()]!, walkCount: 0, durationSec: 0, poopCount: 0 }
      buckets.push(bar)
      index.set(key, bar)
    }

    const consistency: DistItem<Consistency>[] = CONSISTENCY_OPTIONS.map((o) => ({ ...o, count: 0 }))
    const color: DistItem<PoopColor>[] = COLOR_OPTIONS.map((o) => ({ ...o, count: 0 }))

    const empty: Stats = {
      days: buckets, totalWalks: 0, totalDurationSec: 0, totalPoops: 0, abnormalPoops: 0, consistency, color,
    }
    if (!user.value) return empty

    const since = new Date()
    since.setDate(since.getDate() - (days - 1))
    since.setHours(0, 0, 0, 0)
    const sinceIso = since.toISOString()

    const [walksRes, poopsRes] = await Promise.all([
      supabase.from('walk_sessions').select('started_at,duration_sec')
        .gte('started_at', sinceIso).not('ended_at', 'is', null),
      supabase.from('poop_logs').select('logged_at,consistency,color').gte('logged_at', sinceIso),
    ])
    if (walksRes.error) throw walksRes.error
    if (poopsRes.error) throw poopsRes.error

    let totalWalks = 0
    let totalDurationSec = 0
    for (const w of walksRes.data ?? []) {
      const bar = index.get(localDateKey(new Date(w.started_at)))
      if (!bar) continue
      bar.walkCount++
      bar.durationSec += w.duration_sec ?? 0
      totalWalks++
      totalDurationSec += w.duration_sec ?? 0
    }

    let totalPoops = 0
    let abnormalPoops = 0
    const cMap = new Map(consistency.map((c) => [c.value, c]))
    const colMap = new Map(color.map((c) => [c.value, c]))
    for (const p of poopsRes.data ?? []) {
      const bar = index.get(localDateKey(new Date(p.logged_at)))
      if (bar) bar.poopCount++
      cMap.get(p.consistency)!.count++
      colMap.get(p.color)!.count++
      totalPoops++
      if (p.consistency !== 'normal' || p.color !== 'brown') abnormalPoops++
    }

    return { days: buckets, totalWalks, totalDurationSec, totalPoops, abnormalPoops, consistency, color }
  }

  return { fetchStats }
}
