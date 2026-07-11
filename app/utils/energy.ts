// 散步活力狀態：型別與顯示用工具（結束畫面手動選）。
// 便便有 normal/abnormal 的概念，活力同理：low（不太動）標記為需注意，
// 供 UI 以警示色呈現、並餵給 AI 週報做健康解讀。

export type EnergyLevel =
  | 'high' // 活力充沛
  | 'normal' // 正常
  | 'tired' // 累了（散步後正常的疲累）
  | 'low' // 不太動（懶洋洋、提不起勁，需注意）

interface EnergyMeta {
  value: EnergyLevel
  label: string
  icon: string
  /** 是否視為需要注意的狀態（low） */
  abnormal: boolean
}

// 依活力高→低排列，供結束畫面的選擇列使用
export const ENERGY_LEVELS: EnergyLevel[] = ['high', 'normal', 'tired', 'low']

const ENERGY_META: Record<EnergyLevel, EnergyMeta> = {
  high: { value: 'high', label: '活力充沛', icon: 'lucide:zap', abnormal: false },
  normal: { value: 'normal', label: '正常', icon: 'lucide:dog', abnormal: false },
  tired: { value: 'tired', label: '累了', icon: 'lucide:battery-low', abnormal: false },
  low: { value: 'low', label: '不太動', icon: 'lucide:battery-warning', abnormal: true },
}

export function energyMeta(level: EnergyLevel): EnergyMeta {
  return ENERGY_META[level]
}
