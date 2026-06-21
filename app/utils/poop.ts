import type { Consistency, PoopColor } from '~/types/database'

// 便便性狀／顏色的顯示設定（中文標籤 + 是否異常；顏色另附色票 swatch）
// 集中管理，元件與 AI prompt 共用，避免散落各處。

export interface OptionMeta<T extends string> {
  value: T
  label: string
  /** 是否視為需要注意的異常狀態 */
  abnormal: boolean
  /** 顏色選項的色票（性狀選項為 undefined） */
  swatch?: string
}

export const CONSISTENCY_OPTIONS: OptionMeta<Consistency>[] = [
  { value: 'normal', label: '正常', abnormal: false },
  { value: 'soft', label: '軟便', abnormal: true },
  { value: 'loose', label: '稀水', abnormal: true },
  { value: 'hard', label: '偏硬', abnormal: true },
]

export const COLOR_OPTIONS: OptionMeta<PoopColor>[] = [
  { value: 'brown', label: '棕色', abnormal: false, swatch: '#8A5A2B' },
  { value: 'yellow', label: '黃色', abnormal: true, swatch: '#D8A72E' },
  { value: 'black', label: '黑色', abnormal: true, swatch: '#2B2B2B' },
  { value: 'red', label: '帶血', abnormal: true, swatch: '#C0392B' },
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
