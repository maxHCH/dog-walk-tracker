import Foundation

// 移植自 web/app/utils/time.ts

/// 秒數 → H:MM:SS 或 MM:SS（散步計時器用）
func formatDuration(_ totalSec: Int) -> String {
    let s = max(0, totalSec)
    let h = s / 3600
    let m = (s % 3600) / 60
    let sec = s % 60
    return h > 0
        ? String(format: "%d:%02d:%02d", h, m, sec)
        : String(format: "%02d:%02d", m, sec)
}
