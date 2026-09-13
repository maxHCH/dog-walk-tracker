// GPS 路線 / 距離工具
// route_json 以精簡格式儲存：[lng, lat, t]（t = 相對開始的秒數）
// 經緯度先後採 GeoJSON 慣例（lng, lat），與地圖工具一致。

export type RoutePoint = [lng: number, lat: number, t: number]

const EARTH_R = 6371000 // 公尺

/** 兩點間大圓距離（公尺）— Haversine */
export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h
    = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_R * Math.asin(Math.sqrt(h))
}

/** 路線累計距離（公尺） */
export function routeDistance(route: RoutePoint[]): number {
  let sum = 0
  for (let i = 1; i < route.length; i++) {
    const [lng1, lat1] = route[i - 1]!
    const [lng2, lat2] = route[i]!
    sum += haversine({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 })
  }
  return sum
}

/** 公尺 → 易讀字串（<1km 顯示公尺，否則公里） */
export function formatDistance(m: number | null | undefined): string {
  if (!m || m < 1) return '0 m'
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(2)} km`
}

/**
 * 把路線投影到指定寬高的 SVG 座標（等比例置中，維持經緯度長寬比）。
 * 回傳 polyline 用的 "x,y x,y …" 字串；點數 < 2 時回傳空字串。
 */
export function routeToPolyline(
  route: RoutePoint[],
  width: number,
  height: number,
  pad = 6,
): string {
  if (!route || route.length < 2) return ''
  const lngs = route.map((p) => p[0])
  const lats = route.map((p) => p[1])
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  // 緯度方向 1 度的實際距離固定；經度方向需乘 cos(lat) 修正長寬比
  const midLat = (minLat + maxLat) / 2
  const spanLng = (maxLng - minLng) * Math.cos((midLat * Math.PI) / 180)
  const spanLat = maxLat - minLat
  const span = Math.max(spanLng, spanLat, 1e-9)

  const w = width - pad * 2
  const h = height - pad * 2
  const scale = Math.min(w / span, h / span)
  const offX = pad + (w - spanLng * scale) / 2
  const offY = pad + (h - spanLat * scale) / 2

  return route
    .map(([lng, lat]) => {
      const x = offX + (lng - minLng) * Math.cos((midLat * Math.PI) / 180) * scale
      // SVG y 向下，緯度越大越往上 → 反轉
      const y = offY + (maxLat - lat) * scale
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
