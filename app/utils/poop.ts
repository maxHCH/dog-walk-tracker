import type { Consistency, PoopColor } from '~/types/database'

// 便便性狀／顏色的顯示設定（中文標籤 + emoji + 是否異常）
// 集中管理，元件與 AI prompt 共用，避免散落各處。

export interface OptionMeta<T extends string> {
  value: T
  label: string
  emoji: string
  /** 是否視為需要注意的異常狀態 */
  abnormal: boolean
}

export const CONSISTENCY_OPTIONS: OptionMeta<Consistency>[] = [
  { value: 'normal', label: '正常', emoji: '💩', abnormal: false },
  { value: 'soft', label: '軟便', emoji: '🟤', abnormal: true },
  { value: 'loose', label: '稀水', emoji: '💧', abnormal: true },
  { value: 'hard', label: '偏硬', emoji: '🪨', abnormal: true },
]

export const COLOR_OPTIONS: OptionMeta<PoopColor>[] = [
  { value: 'brown', label: '棕色', emoji: '🟫', abnormal: false },
  { value: 'yellow', label: '黃色', emoji: '🟨', abnormal: true },
  { value: 'black', label: '黑色', emoji: '⬛', abnormal: true },
  { value: 'red', label: '帶血', emoji: '🟥', abnormal: true },
]

export function consistencyMeta(v: Consistency): OptionMeta<Consistency> {
  return CONSISTENCY_OPTIONS.find((o) => o.value === v) ?? CONSISTENCY_OPTIONS[0]!
}

export function colorMeta(v: PoopColor): OptionMeta<PoopColor> {
  return COLOR_OPTIONS.find((o) => o.value === v) ?? COLOR_OPTIONS[0]!
}

/** 黑色或帶血 → 計劃書 §5.4 直接建議就醫 */
export function isCriticalColor(v: PoopColor): boolean {
  return v === 'black' || v === 'red'
}
