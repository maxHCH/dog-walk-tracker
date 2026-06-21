import type { DogGender } from '~/types/database'

// 狗狗資料的顯示工具：年齡換算與性別標籤。

export const GENDER_OPTIONS: { value: DogGender; label: string; icon: string }[] = [
  { value: 'male', label: '公', icon: 'lucide:mars' },
  { value: 'female', label: '母', icon: 'lucide:venus' },
]

export function genderLabel(g: DogGender | null | undefined): string | null {
  return GENDER_OPTIONS.find((o) => o.value === g)?.label ?? null
}

/** 狗狗最老約 40 歲 → 出生年下限 */
export const OLDEST_DOG_YEARS = 40

export function currentYear(): number {
  return new Date().getFullYear()
}

/** 可填的出生年範圍（給 input 的 min/max 與夾值用） */
export function birthYearRange(): { min: number; max: number } {
  const y = currentYear()
  return { min: y - OLDEST_DOG_YEARS, max: y }
}

/** 由出生年換算歲數顯示：當年出生為「未滿 1 歲」，其餘「X 歲」（隨年份自動增長） */
export function ageFromBirthYear(birthYear: number | null | undefined): string | null {
  if (birthYear == null) return null
  const age = currentYear() - birthYear
  if (age < 0) return null // 出生年填到未來，視為無效
  if (age === 0) return '未滿 1 歲'
  return `${age} 歲`
}
