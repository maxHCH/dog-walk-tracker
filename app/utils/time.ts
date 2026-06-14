/** 秒數 → HH:MM:SS 或 MM:SS（散步計時器用） */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** 兩個 ISO 時間字串相差的秒數 */
export function diffSec(startIso: string, endIso: string | number = Date.now()): number {
  const end = typeof endIso === 'number' ? endIso : new Date(endIso).getTime()
  return Math.floor((end - new Date(startIso).getTime()) / 1000)
}
