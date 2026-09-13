import type { Database, PoopLog, WalkSession } from '~/types/database'

// 歷史記錄資料層：抓近 N 天的散步＋便便，依「當地日期」分組。
// 便便依 session_id 掛回對應散步；找不到散步的便便（無 session 或跨日）
// 歸入當日的 strayPoops，確保每筆記錄都看得到。

export interface WalkWithPoops extends WalkSession {
  poops: PoopLog[]
}

export interface DayGroup {
  /** YYYY-MM-DD（當地） */
  date: string
  label: string
  walks: WalkWithPoops[]
  strayPoops: PoopLog[]
  walkCount: number
  poopCount: number
  abnormalCount: number
}

function localDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayKey = () => localDateKey(new Date().toISOString())

function dayLabel(key: string): string {
  if (key === todayKey()) return '今天'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (key === localDateKey(y.toISOString())) return '昨天'
  const [yy, mm, dd] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })
    .format(new Date(yy!, mm! - 1, dd!))
}

export function isAbnormalPoop(p: PoopLog): boolean {
  return p.consistency !== 'normal' || p.color !== 'brown'
}

export function useHistory() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  /** 抓近 days 天並分組（只含已結束的散步，進行中的不列入歷史） */
  async function fetchHistory(days = 30): Promise<DayGroup[]> {
    if (!user.value) return []
    const since = new Date()
    since.setDate(since.getDate() - (days - 1))
    since.setHours(0, 0, 0, 0)
    const sinceIso = since.toISOString()

    const [walksRes, poopsRes] = await Promise.all([
      supabase.from('walk_sessions').select('*')
        .gte('started_at', sinceIso).not('ended_at', 'is', null)
        .order('started_at', { ascending: false }),
      supabase.from('poop_logs').select('*')
        .gte('logged_at', sinceIso).order('logged_at', { ascending: false }),
    ])
    if (walksRes.error) throw walksRes.error
    if (poopsRes.error) throw poopsRes.error

    const walks = walksRes.data ?? []
    const poops = poopsRes.data ?? []

    // 便便依 session_id 分桶
    const bySession = new Map<string, PoopLog[]>()
    const claimedWalkIds = new Set(walks.map((w) => w.id))
    for (const p of poops) {
      if (p.session_id && claimedWalkIds.has(p.session_id)) {
        const bucket = bySession.get(p.session_id) ?? []
        bucket.push(p)
        bySession.set(p.session_id, bucket)
      }
    }
    const claimedPoopIds = new Set(
      [...bySession.values()].flat().map((p) => p.id),
    )

    // 依日期建立分組
    const groups = new Map<string, DayGroup>()
    const ensure = (key: string): DayGroup => {
      let g = groups.get(key)
      if (!g) {
        g = { date: key, label: dayLabel(key), walks: [], strayPoops: [], walkCount: 0, poopCount: 0, abnormalCount: 0 }
        groups.set(key, g)
      }
      return g
    }

    for (const w of walks) {
      const g = ensure(localDateKey(w.started_at))
      const wp = (bySession.get(w.id) ?? []).slice().sort((a, b) => a.logged_at.localeCompare(b.logged_at))
      g.walks.push({ ...w, poops: wp })
      g.walkCount++
    }
    for (const p of poops) {
      if (claimedPoopIds.has(p.id)) continue
      ensure(localDateKey(p.logged_at)).strayPoops.push(p)
    }
    // 統計每日便便數
    for (const g of groups.values()) {
      const all = [...g.walks.flatMap((w) => w.poops), ...g.strayPoops]
      g.poopCount = all.length
      g.abnormalCount = all.filter(isAbnormalPoop).length
    }

    // 依日期新→舊
    return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date))
  }

  /** 刪除散步（連帶便便由 FK ON DELETE CASCADE 清除） */
  async function deleteWalk(id: string): Promise<void> {
    const { error } = await supabase.from('walk_sessions').delete().eq('id', id)
    if (error) throw error
  }

  return { fetchHistory, deleteWalk }
}
