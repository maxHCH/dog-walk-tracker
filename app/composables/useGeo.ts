import type { RoutePoint } from '~/utils/geo'
import { haversine } from '~/utils/geo'

// 散步途中的 GPS 追蹤：watchPosition 累積路線點 + 即時距離。
// 設計重點：
// - 純前端、不需網路，離線也能用（PWA 友善）。
// - 權限被拒 / 裝置不支援時靜默降級，計時功能照常。
// - 為避免抖動，過近（<5m）或精度太差（>50m）的點忽略不累計距離。

const MIN_MOVE_M = 5
const MAX_ACCURACY_M = 50

export type GeoStatus = 'idle' | 'tracking' | 'denied' | 'unsupported' | 'error'

export function useGeo() {
  const status = ref<GeoStatus>('idle')
  const distanceM = ref(0)
  const route = ref<RoutePoint[]>([])
  const startTs = ref(0)

  let watchId: number | null = null
  let last: { lat: number; lng: number } | null = null

  function start() {
    if (watchId !== null) return
    if (!import.meta.client || !('geolocation' in navigator)) {
      status.value = 'unsupported'
      return
    }
    distanceM.value = 0
    route.value = []
    last = null
    startTs.value = Date.now()
    status.value = 'tracking'

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        if (accuracy != null && accuracy > MAX_ACCURACY_M) return

        if (last) {
          const d = haversine(last, { lat, lng })
          if (d < MIN_MOVE_M) return // 視為靜止抖動，不累計也不記點
          distanceM.value += d
        }
        last = { lat, lng }
        const t = Math.floor((Date.now() - startTs.value) / 1000)
        route.value.push([lng, lat, t])
      },
      (err) => {
        status.value = err.code === err.PERMISSION_DENIED ? 'denied' : 'error'
        stop()
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    )
  }

  function stop() {
    if (watchId !== null && import.meta.client) {
      navigator.geolocation.clearWatch(watchId)
    }
    watchId = null
  }

  /** 結束時取出結果並重置 */
  function snapshot() {
    return {
      distanceM: route.value.length >= 2 ? Math.round(distanceM.value) : null,
      route: route.value.length >= 2 ? [...route.value] : null,
    }
  }

  function reset() {
    stop()
    status.value = 'idle'
    distanceM.value = 0
    route.value = []
    last = null
  }

  onScopeDispose(() => stop())

  return { status, distanceM, route, start, stop, snapshot, reset }
}
