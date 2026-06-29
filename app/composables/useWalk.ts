import type { Database, WalkSession } from '~/types/database'
import type { RoutePoint } from '~/utils/geo'
import type { Weather } from '~/utils/weather'
import { diffSec } from '~/utils/time'

/** 結束散步時可一併寫入的資料 */
export interface EndWalkExtras {
  distanceM?: number | null
  route?: RoutePoint[] | null
  note?: string | null
  /** 天氣（結束畫面手動覆寫用）；undefined = 沿用開始時抓到的 */
  weather?: Weather | null
  /** 指定結束時間（忘記結束時回填用）；預設為現在 */
  endedAt?: string
}

// 散步狀態管理（計劃書 §5.1）
// 使用 useState 讓 active session 在頁面間共享、SSR 安全。
// App 重開後從 Supabase 讀取 ended_at = null 的 session 繼續計時。

const DEFAULT_DOG_NAME = '我家狗狗'

export function useWalk() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  // 跨元件共享的進行中散步
  const active = useState<WalkSession | null>('walk:active', () => null)
  const loading = useState<boolean>('walk:loading', () => false)

  const isWalking = computed(() => !!active.value && !active.value.ended_at)

  /** 從 DB 載入尚未結束的散步（App 重開時呼叫） */
  async function loadActive() {
    if (!user.value) return
    const { data, error } = await supabase
      .from('walk_sessions')
      .select('*')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    active.value = data
  }

  /** 開始散步：建立 ended_at = null 的 row */
  async function startWalk(dogName = DEFAULT_DOG_NAME) {
    if (!user.value) throw new Error('尚未登入')
    if (isWalking.value) return active.value
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('walk_sessions')
        .insert({ user_id: user.value.id, dog_name: dogName })
        .select('*')
        .single()
      if (error) throw error
      active.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  /** 開始後非同步抓到天氣時回寫進行中的散步（背景進行，不擋流程） */
  async function setWeather(weather: Weather | null) {
    if (!active.value || !weather) return
    const id = active.value.id
    active.value = { ...active.value, weather_json: weather as unknown as WalkSession['weather_json'] }
    const { error } = await supabase
      .from('walk_sessions')
      .update({ weather_json: weather as never })
      .eq('id', id)
    if (error) throw error
  }

  /** 結束散步：寫入 ended_at、duration_sec，以及 GPS / 備註 / 天氣等附加資料 */
  async function endWalk(extras: EndWalkExtras = {}) {
    if (!active.value) return null
    loading.value = true
    try {
      const endedAt = extras.endedAt ?? new Date().toISOString()
      const duration = Math.max(0, diffSec(active.value.started_at, endedAt))
      const note = extras.note?.trim() || null
      // weather undefined = 沿用開始時抓到並已寫入的天氣
      const weather = extras.weather !== undefined
        ? (extras.weather as never)
        : (active.value.weather_json as never)
      const { data, error } = await supabase
        .from('walk_sessions')
        .update({
          ended_at: endedAt,
          duration_sec: duration,
          distance_m: extras.distanceM ?? null,
          route_json: extras.route ?? null,
          note,
          weather_json: weather,
        })
        .eq('id', active.value.id)
        .select('*')
        .single()
      if (error) throw error
      active.value = null
      return data
    } finally {
      loading.value = false
    }
  }

  return { active, loading, isWalking, loadActive, startWalk, setWeather, endWalk }
}
