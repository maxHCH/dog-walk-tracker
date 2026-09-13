import CoreLocation
import Foundation

// 散步途中的 GPS 追蹤。移植自 web/app/composables/useGeo.ts，但底層完全不同：
//
// 網頁版用 navigator.geolocation.watchPosition，一鎖屏就被系統凍結——
// useWakeLock 那整支檔案就是在跟這件事搏鬥，代價是逼使用者整趟散步開著螢幕。
//
// 這裡用 iOS 17 的兩個 API：
//   CLBackgroundActivitySession —— 使用者主動開始一個活動時建立，
//     讓我們用「使用 App 期間」這個最小權限就能在鎖屏後繼續收位置。
//     系統會在狀態列顯示藍色指示器，讓使用者知道正在記錄。
//   CLLocationUpdate.liveUpdates(.fitness) —— 非同步序列，.fitness 會讓系統
//     針對步行場景調校取樣頻率，並在靜止時自動省電。
// 注意：CLLocationUpdate 上的 authorizationDenied 等屬性是 iOS 18 才有的，
// 目標 17.6 不能用，所以授權狀態改從 CLLocationManagerDelegate 取得——
// 這也是 iOS 14 以來的標準做法。
@MainActor
@Observable
final class LocationService: NSObject, CLLocationManagerDelegate {
    enum Status {
        case idle, tracking, denied, unavailable
    }

    /// 過近的點視為靜止抖動，不累計距離也不記點
    private static let minMoveM: CLLocationDistance = 5
    /// 精度太差的點直接丟棄
    private static let maxAccuracyM: CLLocationAccuracy = 50

    private(set) var status: Status = .idle
    private(set) var distanceM: CLLocationDistance = 0
    /// 路線點 [經度, 緯度, 起跑後秒數]，格式與網頁版的 route_json 一致
    private(set) var route: [[Double]] = []

    private let manager = CLLocationManager()
    private var session: CLBackgroundActivitySession?
    private var updatesTask: Task<Void, Never>?
    private var lastLocation: CLLocation?
    private var startedAt: Date?

    override init() {
        super.init()
        manager.delegate = self
    }

    var hint: String? {
        switch status {
        case .denied: "未授權定位，僅計時"
        case .unavailable: "定位訊號不佳"
        case .idle, .tracking: nil
        }
    }

    // MARK: - 對外

    func start() {
        guard updatesTask == nil else { return }
        distanceM = 0
        route = []
        lastLocation = nil
        startedAt = Date()
        status = .tracking

        // 已經被拒就不必啟動，直接降級成僅計時
        if manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted {
            status = .denied
            return
        }
        manager.requestWhenInUseAuthorization()
        // 建立 session 就等於告訴系統「使用者開始了一個活動」，
        // 背景定位的權限來自這裡。結束時一定要 invalidate，否則會一直耗電。
        session = CLBackgroundActivitySession()
        updatesTask = Task { await consumeUpdates() }
    }

    func stop() {
        updatesTask?.cancel()
        updatesTask = nil
        session?.invalidate()
        session = nil
        lastLocation = nil
        if status == .tracking { status = .idle }
    }

    /// 結束散步時取出結果。少於 2 個點視為沒有有效路線。
    func snapshot() -> (distanceM: Int?, routeData: Data?) {
        guard route.count >= 2 else { return (nil, nil) }
        return (Int(distanceM.rounded()), try? JSONEncoder().encode(route))
    }

    // MARK: - 內部

    private func consumeUpdates() async {
        do {
            for try await update in CLLocationUpdate.liveUpdates(.fitness) {
                if Task.isCancelled { return }
                guard let location = update.location else { continue }
                ingest(location)
            }
        } catch {
            status = .unavailable
        }
    }

    /// 使用者在權限彈窗按下選擇、或之後到設定裡改動時會呼叫。
    /// 被拒時靜默降級成僅計時，不擋散步（與網頁版一致）。
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let auth = manager.authorizationStatus
        Task { @MainActor [weak self] in
            guard let self else { return }
            if auth == .denied || auth == .restricted {
                self.status = .denied
                self.stop()
            }
        }
    }

    private func ingest(_ location: CLLocation) {
        // 負數代表無效值
        guard location.horizontalAccuracy >= 0,
              location.horizontalAccuracy <= Self.maxAccuracyM else { return }

        if let last = lastLocation {
            // CLLocation 內建大圓距離，不必自己寫 haversine（web 那邊要自己實作）
            let moved = location.distance(from: last)
            guard moved >= Self.minMoveM else { return }
            distanceM += moved
        }
        lastLocation = location

        let elapsed = Int(Date().timeIntervalSince(startedAt ?? Date()))
        route.append([
            location.coordinate.longitude,
            location.coordinate.latitude,
            Double(elapsed),
        ])
    }
}

/// 公尺 → 顯示字串。移植自 web/app/utils/geo.ts 的 formatDistance。
func formatDistance(_ meters: Double) -> String {
    meters >= 1000
        ? String(format: "%.2f 公里", meters / 1000)
        : String(format: "%.0f 公尺", meters)
}
