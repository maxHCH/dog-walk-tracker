// 近 7 天資料的彙整邏輯（純函式，不碰網路也不碰 DB）。
// 從原本的 server/api/ai-report.post.ts 原封搬過來，只是抽成獨立檔案，
// 方便單獨閱讀與日後測試。丟給 Claude 的 payload 就是這裡組出來的。

// 注意：這裡的 row 型別是就近定義的精簡版，不是 app/types/database.ts。
// Edge Function 跑在 Deno，吃不到 Nuxt 的 `~` 路徑別名，所以兩邊各自定義。
// 欄位如果改了 schema，記得兩邊都要動。

export interface Weather {
  status: string
  tempC: number | null
  humidity: number | null
}

export interface WalkRow {
  started_at: string
  duration_sec: number | null
  distance_m: number | null
  weather_json: Weather | null
  energy: string | null
}

export interface PoopRow {
  logged_at: string
  consistency: string
  color: string
  note: string | null
}

export interface DogRow {
  name: string
  gender: string | null
  birth_year: number | null
}

const CONSISTENCY_LABEL: Record<string, string> = {
  normal: '正常', soft: '軟便', loose: '稀水', hard: '偏硬',
}
const COLOR_LABEL: Record<string, string> = {
  brown: '棕色', yellow: '黃色', black: '黑色', red: '帶血',
}
// 對應 app/utils/weather.ts 的 WeatherStatus
const WEATHER_LABEL: Record<string, string> = {
  clear: '晴', partly: '多雲', cloudy: '陰', fog: '霧',
  drizzle: '毛毛雨', rain: '雨', snow: '雪', thunder: '雷雨',
}
// 對應 app/utils/energy.ts 的 EnergyLevel；low（不太動）視為需注意
const ENERGY_LABEL: Record<string, string> = {
  high: '活力充沛', normal: '正常', tired: '累了', low: '不太動',
}

/** 取陣列中出現最多次的元素（同次數取先出現者） */
function mostCommon(arr: string[]): string | undefined {
  if (!arr.length) return undefined
  const count = new Map<string, number>()
  for (const x of arr) count.set(x, (count.get(x) ?? 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/** ISO 時間 → 當地日期字串 YYYY-MM-DD */
export function localDate(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const isAbnormal = (p: { consistency: string; color: string }) =>
  p.consistency !== 'normal' || p.color !== 'brown'
const isCritical = (p: { color: string }) => p.color === 'black' || p.color === 'red'

const round1 = (n: number) => Math.round(n * 10) / 10

/** 有記錄的天數（散步或便便任一即算），用來判斷資料是否足夠分析 */
export function countDaysWithData(walks: WalkRow[], poops: PoopRow[]): number {
  return new Set([
    ...walks.map((w) => localDate(w.started_at)),
    ...poops.map((p) => localDate(p.logged_at)),
  ]).size
}

/** 組出要丟給 Claude 的分析 payload */
export function buildPayload(opts: {
  walks: WalkRow[]
  poops: PoopRow[]
  dog: DogRow | null
  periodStart: string
  periodEnd: string
}) {
  const { walks, poops, dog, periodStart, periodEnd } = opts

  type DayAgg = {
    walks: number; durationMin: number; poops: number; abnormalPoops: number
    temps: number[]; conditions: string[]; energies: string[]
  }
  const perDay = new Map<string, DayAgg>()
  const ensure = (k: string) => {
    let d = perDay.get(k)
    if (!d) {
      d = { walks: 0, durationMin: 0, poops: 0, abnormalPoops: 0, temps: [], conditions: [], energies: [] }
      perDay.set(k, d)
    }
    return d
  }
  for (const w of walks) {
    const d = ensure(localDate(w.started_at))
    d.walks++
    d.durationMin += Math.round((w.duration_sec ?? 0) / 60)
    const wx = w.weather_json
    if (wx) {
      if (wx.tempC != null) d.temps.push(wx.tempC)
      if (wx.status) d.conditions.push(WEATHER_LABEL[wx.status] ?? wx.status)
    }
    if (w.energy) d.energies.push(ENERGY_LABEL[w.energy] ?? w.energy)
  }
  for (const p of poops) {
    const d = ensure(localDate(p.logged_at))
    d.poops++
    if (isAbnormal(p)) d.abnormalPoops++
  }

  // 天氣彙整：覆蓋率、溫度範圍、炎熱/寒冷散步次數、天氣型態分布
  const weathers = walks.map((w) => w.weather_json).filter((w): w is Weather => !!w)
  const temps = weathers.map((w) => w.tempC).filter((t): t is number => t != null)
  const weatherSummary = weathers.length
    ? {
        coveredWalks: weathers.length,
        totalWalks: walks.length,
        tempC: temps.length
          ? {
              min: Math.min(...temps),
              max: Math.max(...temps),
              avg: round1(temps.reduce((s, t) => s + t, 0) / temps.length),
            }
          : null,
        hotWalks: temps.filter((t) => t >= 28).length, // 炎熱：留意中暑、縮短時長
        coldWalks: temps.filter((t) => t <= 10).length, // 寒冷：留意保暖
        conditions: [...new Set(weathers.map((w) => WEATHER_LABEL[w.status] ?? w.status))]
          .map((label) => ({
            label,
            count: weathers.filter((w) => (WEATHER_LABEL[w.status] ?? w.status) === label).length,
          }))
          .sort((a, b) => b.count - a.count),
      }
    : null

  // 活力彙整：覆蓋率、分布、不太動（low）次數——低活力連續出現值得注意
  const energies = walks.map((w) => w.energy).filter((e): e is string => !!e)
  const energySummary = energies.length
    ? {
        coveredWalks: energies.length,
        totalWalks: walks.length,
        lowWalks: energies.filter((e) => e === 'low').length,
        distribution: [...new Set(energies)]
          .map((level) => ({
            label: ENERGY_LABEL[level] ?? level,
            count: energies.filter((e) => e === level).length,
          }))
          .sort((a, b) => b.count - a.count),
      }
    : null

  return {
    dog: {
      name: dog?.name ?? '狗狗',
      gender: dog?.gender === 'male' ? '公' : dog?.gender === 'female' ? '母' : '未知',
      ageYears: dog?.birth_year ? new Date().getFullYear() - dog.birth_year : null,
    },
    period: { start: periodStart, end: periodEnd, days: 7 },
    totals: {
      walks: walks.length,
      totalDurationMin: walks.reduce((s, w) => s + Math.round((w.duration_sec ?? 0) / 60), 0),
      poops: poops.length,
      abnormalPoops: poops.filter(isAbnormal).length,
      criticalPoops: poops.filter(isCritical).length,
    },
    weather: weatherSummary,
    energy: energySummary,
    perDay: [...perDay.entries()].sort().map(([date, v]) => ({
      date,
      walks: v.walks,
      durationMin: v.durationMin,
      poops: v.poops,
      abnormalPoops: v.abnormalPoops,
      avgTempC: v.temps.length ? round1(v.temps.reduce((s, t) => s + t, 0) / v.temps.length) : null,
      weather: mostCommon(v.conditions),
      energy: mostCommon(v.energies),
    })),
    poops: poops
      .slice()
      .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
      .map((p) => ({
        date: localDate(p.logged_at),
        consistency: CONSISTENCY_LABEL[p.consistency] ?? p.consistency,
        color: COLOR_LABEL[p.color] ?? p.color,
        abnormal: isAbnormal(p),
        critical: isCritical(p),
        note: p.note || undefined,
      })),
  }
}
