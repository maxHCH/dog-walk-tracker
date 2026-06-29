import type { Weather } from '~/utils/weather'
import { statusFromCode } from '~/utils/weather'

// 散步天氣：依目前定位向 Open-Meteo 取「當下天氣」。
// 設計重點（比照 useGeo 的靜默降級）：
// - 純前端、免 API key；未授權定位 / 離線 / 請求失敗時回 null，不擋散步。
// - 用 getCurrentPosition（單次、低精度即可），不需高精度也不耗電。

interface OpenMeteoCurrent {
  temperature_2m?: number
  relative_humidity_2m?: number
  weather_code?: number
}

function getCoords(): Promise<{ lat: number; lng: number } | null> {
  if (!import.meta.client || !('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 8000 },
    )
  })
}

export function useWeather() {
  const loading = useState<boolean>('walk:weatherLoading', () => false)

  /** 依目前定位抓當下天氣；任何失敗都回 null（靜默降級） */
  async function fetchCurrent(): Promise<Weather | null> {
    loading.value = true
    try {
      const c = await getCoords()
      if (!c) return null
      const url = 'https://api.open-meteo.com/v1/forecast'
        + `?latitude=${c.lat}&longitude=${c.lng}`
        + '&current=temperature_2m,relative_humidity_2m,weather_code'
      const res = await $fetch<{ current?: OpenMeteoCurrent }>(url)
      const cur = res?.current
      if (!cur || cur.weather_code == null) return null
      return {
        code: cur.weather_code,
        status: statusFromCode(cur.weather_code),
        tempC: cur.temperature_2m ?? null,
        humidity: cur.relative_humidity_2m ?? null,
      }
    } catch {
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, fetchCurrent }
}
