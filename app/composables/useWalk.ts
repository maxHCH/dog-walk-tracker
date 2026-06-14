import type { Database, WalkSession } from '~/types/database'
import { diffSec } from '~/utils/time'

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

  /** 結束散步：寫入 ended_at 與 duration_sec */
  async function endWalk() {
    if (!active.value) return null
    loading.value = true
    try {
      const endedAt = new Date().toISOString()
      const duration = diffSec(active.value.started_at, endedAt)
      const { data, error } = await supabase
        .from('walk_sessions')
        .update({ ended_at: endedAt, duration_sec: duration })
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

  return { active, loading, isWalking, loadActive, startWalk, endWalk }
}
