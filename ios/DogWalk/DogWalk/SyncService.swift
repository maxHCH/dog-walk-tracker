import Foundation
import SwiftData
import Supabase

// 把本機待同步的記錄推到 Supabase（見 docs/adr/0002）。
//
// 方向是單向的：本機是真相，這裡只負責「推上去」，不回拉。
// 所以不需要衝突解決——手機是唯一的寫入端（網頁版已降級為檢視工具）。
//
// 觸發時機：每次本機寫入之後、以及 App 回到前景時。失敗就原地留著，
// syncedAt 保持 nil，下次再試——這就是離線可用的全部祕密。
@MainActor
@Observable
final class SyncService {
    private(set) var isSyncing = false
    private(set) var pendingCount = 0
    /// 最近一次同步失敗的原因。離線時會有值，但不該打擾使用者——記錄仍然安全地在本機。
    private(set) var lastErrorMessage: String?

    // MARK: - 對外

    /// 推送所有待同步記錄。任何失敗都不會丟資料，只是留待下次。
    func pushPending(userID: UUID, in context: ModelContext) async {
        guard !isSyncing else { return }
        isSyncing = true
        defer {
            isSyncing = false
            refreshPendingCount(userID: userID, in: context)
        }

        do {
            // 順序不能反：poop_logs.session_id 有 FK 指向 walk_sessions，
            // 便便先推會因為找不到對應的散步而失敗。
            try await pushWalks(userID: userID, in: context)
            try await pushPoops(userID: userID, in: context)
            lastErrorMessage = nil
        } catch {
            lastErrorMessage = error.localizedDescription
        }
    }

    /// 更新待同步筆數（給 UI 顯示「尚未同步」用）
    func refreshPendingCount(userID: UUID, in context: ModelContext) {
        let walks = (try? context.fetchCount(
            FetchDescriptor<Walk>(predicate: #Predicate { $0.syncedAt == nil && $0.userID == userID })
        )) ?? 0
        let poops = (try? context.fetchCount(
            FetchDescriptor<Poop>(predicate: #Predicate { $0.syncedAt == nil && $0.userID == userID })
        )) ?? 0
        pendingCount = walks + poops
    }

    // MARK: - 實作

    private func pushWalks(userID: UUID, in context: ModelContext) async throws {
        let pending = try context.fetch(
            FetchDescriptor<Walk>(
                predicate: #Predicate { $0.syncedAt == nil && $0.userID == userID },
                sortBy: [SortDescriptor(\.startedAt)]
            )
        )
        guard !pending.isEmpty else { return }

        let rows = pending.map(WalkRow.init)
        // upsert：id 已由本機決定，所以同一趟散步推第二次（例如結束時補上時長）
        // 會更新既有的列，而不是新增一筆。這是 client 產 id 換來的好處。
        try await supabase
            .from("walk_sessions")
            .upsert(rows, onConflict: "id", returning: .minimal)
            .execute()

        let now = Date()
        for walk in pending { walk.syncedAt = now }
        try context.save()
    }

    private func pushPoops(userID: UUID, in context: ModelContext) async throws {
        let pending = try context.fetch(
            FetchDescriptor<Poop>(
                predicate: #Predicate { $0.syncedAt == nil && $0.userID == userID },
                sortBy: [SortDescriptor(\.loggedAt)]
            )
        )
        guard !pending.isEmpty else { return }

        let rows = pending.map(PoopRow.init)
        try await supabase
            .from("poop_logs")
            .upsert(rows, onConflict: "id", returning: .minimal)
            .execute()

        let now = Date()
        for poop in pending { poop.syncedAt = now }
        try context.save()
    }
}

// MARK: - 送上 Supabase 的列格式
//
// 這些 struct 是「本機模型」與「資料庫欄位」之間的轉接層。
// 分開定義的好處：Swift 這側用駝峰命名、資料庫那側維持 snake_case，
// 而且日後 schema 改欄位時，要動的只有這裡。

private struct WalkRow: Encodable {
    let id: UUID
    let userID: UUID
    let dogName: String
    let startedAt: Date
    let endedAt: Date?
    let durationSec: Int?
    let distanceM: Int?
    let routeJSON: [[Double]]?
    let note: String?
    let energy: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case dogName = "dog_name"
        case startedAt = "started_at"
        case endedAt = "ended_at"
        case durationSec = "duration_sec"
        case distanceM = "distance_m"
        case routeJSON = "route_json"
        case note
        case energy
    }

    init(_ walk: Walk) {
        id = walk.id
        userID = walk.userID
        dogName = walk.dogName
        startedAt = walk.startedAt
        endedAt = walk.endedAt
        durationSec = walk.durationSec
        distanceM = walk.distanceM
        routeJSON = walk.routeData.flatMap { try? JSONDecoder().decode([[Double]].self, from: $0) }
        note = walk.note
        energy = walk.energy?.rawValue
    }
}

private struct PoopRow: Encodable {
    let id: UUID
    let sessionID: UUID?
    let userID: UUID
    let loggedAt: Date
    let consistency: String
    let color: String
    let note: String?

    enum CodingKeys: String, CodingKey {
        case id
        case sessionID = "session_id"
        case userID = "user_id"
        case loggedAt = "logged_at"
        case consistency
        case color
        case note
    }

    init(_ poop: Poop) {
        id = poop.id
        sessionID = poop.walk?.id
        userID = poop.userID
        loggedAt = poop.loggedAt
        consistency = poop.consistency.rawValue
        color = poop.color.rawValue
        note = poop.note
    }
}
