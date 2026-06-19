import type { Database, Dog, DogGender } from '~/types/database'

// 狗狗基本資料：跨頁共享的單一檔案（每位使用者一隻）。
// 供首頁打招呼、散步記錄帶入名字使用。

export interface DogInput {
  name: string
  gender: DogGender | null
  birthYear: number | null
}

export function useDog() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  const dog = useState<Dog | null>('dog:profile', () => null)
  const loaded = useState<boolean>('dog:loaded', () => false)

  async function fetchDog(): Promise<Dog | null> {
    if (!user.value) return null
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('user_id', user.value.id)
      .maybeSingle()
    if (error) {
      // dogs 表可能尚未建立（migration 002 未跑）→ 視為尚無資料，
      // 不讓首頁壞掉，待使用者第一次儲存時再提示。
      console.warn('[useDog] 載入失敗：', error.message)
      loaded.value = true
      return null
    }
    dog.value = data
    loaded.value = true
    return data
  }

  /** 新增或更新狗狗資料（依 user_id 唯一性 upsert） */
  async function saveDog(input: DogInput): Promise<Dog> {
    if (!user.value) throw new Error('尚未登入')
    const { data, error } = await supabase
      .from('dogs')
      .upsert(
        {
          user_id: user.value.id,
          name: input.name.trim(),
          gender: input.gender,
          birth_year: input.birthYear,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single()
    if (error) throw error
    dog.value = data
    loaded.value = true
    return data
  }

  return { dog, loaded, fetchDog, saveDog }
}
