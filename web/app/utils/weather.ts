// 散步天氣：型別、WMO 天氣碼對應，以及顯示用工具。
// 資料來源 Open-Meteo（current weather），免 API key。

export type WeatherStatus =
  | 'clear' // 晴
  | 'partly' // 多雲
  | 'cloudy' // 陰
  | 'fog' // 霧
  | 'drizzle' // 毛毛雨
  | 'rain' // 雨
  | 'snow' // 雪
  | 'thunder' // 雷雨

/** 存進 walk_sessions.weather_json 的結構 */
export interface Weather {
  code: number // WMO weather code（手動覆寫時取該狀態的代表碼）
  status: WeatherStatus
  tempC: number | null
  humidity: number | null
}

interface StatusMeta {
  label: string
  icon: string
}

// 依使用者選擇順序排列，供結束畫面的天氣選擇列使用
export const WEATHER_STATUSES: WeatherStatus[] = [
  'clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'thunder',
]

const STATUS_META: Record<WeatherStatus, StatusMeta> = {
  clear: { label: '晴', icon: 'lucide:sun' },
  partly: { label: '多雲', icon: 'lucide:cloud-sun' },
  cloudy: { label: '陰', icon: 'lucide:cloud' },
  fog: { label: '霧', icon: 'lucide:cloud-fog' },
  drizzle: { label: '毛毛雨', icon: 'lucide:cloud-drizzle' },
  rain: { label: '雨', icon: 'lucide:cloud-rain' },
  snow: { label: '雪', icon: 'lucide:snowflake' },
  thunder: { label: '雷雨', icon: 'lucide:cloud-lightning' },
}

// 手動選某狀態時，回填一個代表性 WMO 碼
const STATUS_CODE: Record<WeatherStatus, number> = {
  clear: 0, partly: 2, cloudy: 3, fog: 45, drizzle: 51, rain: 61, snow: 71, thunder: 95,
}

export function statusMeta(status: WeatherStatus): StatusMeta {
  return STATUS_META[status]
}

export function codeForStatus(status: WeatherStatus): number {
  return STATUS_CODE[status]
}

/** WMO weather code → 我們的狀態分類 */
export function statusFromCode(code: number): WeatherStatus {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'cloudy'
}

/** 顯示用：例如「多雲 28°」 */
export function formatWeather(w: Weather | null): string {
  if (!w) return '—'
  const m = STATUS_META[w.status]
  return w.tempC != null ? `${m.label} ${Math.round(w.tempC)}°` : m.label
}
