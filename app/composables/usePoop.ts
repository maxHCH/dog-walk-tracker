import type { Consistency, Database, PoopColor, PoopLog } from '~/types/database'

// 便便記錄邏輯（計劃書 §5.2）
// session_id 綁定當前散步；同一次散步可記錄多次。

export interface PoopInput {
  consistency: Consistency
  color: PoopColor
  note?: string
}

export function usePoop() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function logPoop(input: PoopInput, sessionId: string | null): Promise<PoopLog> {
    if (!user.value) throw new Error('尚未登入')
    const { data, error } = await supabase
      .from('poop_logs')
      .insert({
        user_id: user.value.id,
        session_id: sessionId,
        consistency: input.consistency,
        color: input.color,
        note: input.note?.trim() || null,
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  /** 取得某次散步的便便記錄 */
  async function poopsForSession(sessionId: string): Promise<PoopLog[]> {
    const { data, error } = await supabase
      .from('poop_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('logged_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }

  return { logPoop, poopsForSession }
}
