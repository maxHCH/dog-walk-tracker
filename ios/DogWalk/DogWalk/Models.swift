import Foundation
import SwiftData

// 本機資料模型（SwiftData）。對應 supabase/migrations 的 walk_sessions / poop_logs。
//
// 設計重點（見 docs/adr/0002）：
// 1. id 由 App 產生，不等伺服器 → 離線也能立刻建立完整記錄，同步時直接 upsert
//    到 Supabase 的同一個 id。網頁版是 insert 後讀回伺服器產生的 id，所以沒訊號就卡住。
// 2. syncedAt == nil 即「待同步」，取代獨立的 outbox 表。查一個條件就是待推清單。
// 3. userID 每筆都存 → 這是本機版的 RLS。所有查詢都必須帶上它，
//    否則換帳號登入會看到別人的資料。
//
// 注意：#Index / #Unique 是 iOS 18 才有的 SwiftData 巨集，本專案目標 17.6，不能用。

// MARK: - 列舉（對應 web/app/utils 與 database.ts 的 union type）

enum Consistency: String, Codable, CaseIterable {
    case normal, soft, loose, hard

    var label: String {
        switch self {
        case .normal: "正常"
        case .soft: "軟便"
        case .loose: "稀水"
        case .hard: "偏硬"
        }
    }
    /// 非 normal 即視為需注意
    var isAbnormal: Bool { self != .normal }
}

enum PoopColor: String, Codable, CaseIterable {
    case brown, yellow, black, red

    var label: String {
        switch self {
        case .brown: "棕色"
        case .yellow: "黃色"
        case .black: "黑色"
        case .red: "帶血"
        }
    }
    var isAbnormal: Bool { self != .brown }
    /// 黑便／血便屬警訊
    var isCritical: Bool { self == .black || self == .red }
}

enum EnergyLevel: String, Codable, CaseIterable {
    case high, normal, tired, low

    var label: String {
        switch self {
        case .high: "活力充沛"
        case .normal: "正常"
        case .tired: "累了"
        case .low: "不太動"
        }
    }
    /// low（不太動）視為需注意的健康訊號
    var isAbnormal: Bool { self == .low }
}

// MARK: - 散步

@Model
final class Walk {
    var id: UUID = UUID()
    /// 這筆屬於哪個帳號。本機版的 RLS，查詢一律要過濾。
    var userID: UUID = UUID()
    var dogName: String = ""
    var startedAt: Date = Date()
    /// nil 表示散步進行中
    var endedAt: Date?
    var durationSec: Int?
    var distanceM: Int?
    /// 路線點編碼成 JSON（[[lng, lat, 相對秒數]]），對應 Supabase 的 route_json。
    /// 一趟數百個座標點，做成關聯表既慢又沒必要。
    var routeData: Data?
    var note: String?
    var energy: EnergyLevel?
    /// nil = 尚未推到 Supabase
    var syncedAt: Date?

    @Relationship(deleteRule: .cascade, inverse: \Poop.walk)
    var poops: [Poop] = []

    var isActive: Bool { endedAt == nil }

    init(userID: UUID, dogName: String, startedAt: Date = Date()) {
        self.id = UUID()
        self.userID = userID
        self.dogName = dogName
        self.startedAt = startedAt
    }
}

// MARK: - 便便

@Model
final class Poop {
    var id: UUID = UUID()
    var userID: UUID = UUID()
    var loggedAt: Date = Date()
    var consistency: Consistency = Consistency.normal
    var color: PoopColor = PoopColor.brown
    var note: String?
    var syncedAt: Date?

    /// 可為 nil：便便也能在散步之外單獨記錄（對應 poop_logs.session_id 可為 null）
    var walk: Walk?

    var isAbnormal: Bool { consistency.isAbnormal || color.isAbnormal }

    init(
        userID: UUID,
        consistency: Consistency,
        color: PoopColor,
        note: String? = nil,
        loggedAt: Date = Date(),
        walk: Walk? = nil
    ) {
        self.id = UUID()
        self.userID = userID
        self.consistency = consistency
        self.color = color
        self.note = note
        self.loggedAt = loggedAt
        self.walk = walk
    }
}
