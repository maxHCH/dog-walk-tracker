import Foundation
import SwiftData

// 散步的寫入層。畫面只呼叫這裡，不需要知道同步的存在。
//
// 每個動作都是同一個節奏：先寫本機（立刻完成、離線也成立），
// 再丟一個背景工作去推 Supabase。推失敗就留著，下次再推。
@MainActor
@Observable
final class WalkStore {
    let sync = SyncService()

    /// 開始散步。回傳新建立的記錄，本機立刻就有完整資料。
    @discardableResult
    func startWalk(userID: UUID, dogName: String, in context: ModelContext) -> Walk {
        let walk = Walk(userID: userID, dogName: dogName)
        context.insert(walk)
        save(context)
        push(userID: userID, in: context)
        return walk
    }

    /// 結束散步：補上結束時間與時長。
    func endWalk(_ walk: Walk, note: String?, energy: EnergyLevel?, in context: ModelContext) {
        let endedAt = Date()
        walk.endedAt = endedAt
        walk.durationSec = max(0, Int(endedAt.timeIntervalSince(walk.startedAt)))
        walk.note = note?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
        walk.energy = energy
        // 內容變了就要重推一次。upsert 會更新同一個 id 的既有列。
        walk.syncedAt = nil
        save(context)
        push(userID: walk.userID, in: context)
    }

    /// 記錄一次便便。walk 為 nil 表示不在散步中單獨記錄。
    @discardableResult
    func logPoop(
        userID: UUID,
        consistency: Consistency,
        color: PoopColor,
        note: String? = nil,
        on walk: Walk?,
        in context: ModelContext
    ) -> Poop {
        let poop = Poop(
            userID: userID,
            consistency: consistency,
            color: color,
            note: note?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            walk: walk
        )
        context.insert(poop)
        save(context)
        push(userID: userID, in: context)
        return poop
    }

    // MARK: - 內部

    private func save(_ context: ModelContext) {
        do {
            try context.save()
        } catch {
            // 本機儲存失敗屬於嚴重狀況（磁碟滿了之類），但不該讓 App 當掉。
            assertionFailure("本機儲存失敗：\(error)")
        }
    }

    private func push(userID: UUID, in context: ModelContext) {
        Task { await sync.pushPending(userID: userID, in: context) }
    }
}

extension String {
    /// 空字串視同沒填，對應資料庫的 null
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
