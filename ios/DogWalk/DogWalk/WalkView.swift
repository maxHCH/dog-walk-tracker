import SwiftUI
import SwiftData

// 散步進行中畫面。移植自 web/app/pages/walk.vue。
// M1 範圍：開始 → 計時 → 便便記錄 → 結束儲存。GPS 是下一步。
struct WalkView: View {
    let userID: UUID

    @Environment(\.modelContext) private var context
    @Environment(\.scenePhase) private var scenePhase
    @Environment(AuthModel.self) private var auth
    @Environment(WalkStore.self) private var store

    // 進行中的散步。@Query 會在資料變動時自動重繪畫面——
    // 相當於網頁版的 useState('walk:active')，但是由資料庫直接驅動。
    // 查詢一律帶上 userID：這是本機版的 RLS。
    @Query private var activeWalks: [Walk]

    @State private var showPoopSheet = false

    init(userID: UUID) {
        self.userID = userID
        _activeWalks = Query(
            filter: #Predicate<Walk> { $0.endedAt == nil && $0.userID == userID },
            sort: \.startedAt,
            order: .reverse
        )
    }

    private var activeWalk: Walk? { activeWalks.first }

    var body: some View {
        ZStack {
            Color.cream.ignoresSafeArea()
            if let walk = activeWalk {
                walking(walk)
            } else {
                idle
            }
        }
        .safeAreaInset(edge: .top) { statusBar }
        .sheet(isPresented: $showPoopSheet) {
            PoopSheet { consistency, color, note in
                guard let walk = activeWalk else { return }
                store.logPoop(
                    userID: userID,
                    consistency: consistency,
                    color: color,
                    note: note,
                    on: walk,
                    in: context
                )
            }
        }
        // 觸發點 2：畫面出現（含冷啟動）
        .task {
            store.sync.startNetworkMonitoring()
            await syncNow()
        }
        // 觸發點 3：從背景回到前景
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await syncNow() } }
        }
        // 觸發點 4：斷線後恢復連線
        .onChange(of: store.sync.isOnline) { _, online in
            if online { Task { await syncNow() } }
        }
    }

    // MARK: - 尚未開始

    private var idle: some View {
        VStack(spacing: 0) {
            Spacer()
            Image(systemName: "dog")
                .font(.system(size: 64))
                .foregroundStyle(Color.walk)
            Text("準備好出發了嗎？")
                .font(.system(size: 24, weight: .semibold, design: .serif))
                .foregroundStyle(Color.ink)
                .padding(.top, 20)
            Text("按下開始，計時與便便記錄就緒")
                .font(.subheadline)
                .foregroundStyle(Color.muted)
                .padding(.top, 6)

            Button {
                store.startWalk(userID: userID, dogName: "我家狗狗", in: context)
            } label: {
                Label("開始散步", systemImage: "figure.walk")
                    .font(.title3.weight(.semibold))
                    .frame(width: 260)
                    .padding(.vertical, 18)
                    .background(Color.walk)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .padding(.top, 36)
            Spacer()
        }
    }

    // MARK: - 散步中

    private func walking(_ walk: Walk) -> some View {
        VStack(spacing: 0) {
            Spacer()

            Text("散步中")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Color.walk)

            // TimelineView 每秒重算一次，畫面自己會更新。
            // 時間一律從 startedAt 推算，所以切到背景再回來依然準確。
            TimelineView(.periodic(from: walk.startedAt, by: 1)) { timeline in
                let elapsed = Int(timeline.date.timeIntervalSince(walk.startedAt))
                Text(formatDuration(elapsed))
                    .font(.system(size: elapsed >= 3600 ? 58 : 68, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Color.walk)
            }
            .padding(.top, 8)

            Button {
                showPoopSheet = true
            } label: {
                Label("記錄便便", systemImage: "pawprint.fill")
                    .font(.title3.weight(.semibold))
                    .frame(width: 280)
                    .padding(.vertical, 20)
                    .background(Color.poop)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
            }
            .padding(.top, 44)

            Text("本次已記錄 \(walk.poops.count) 次")
                .font(.subheadline)
                .foregroundStyle(Color.muted)
                .padding(.top, 12)

            Spacer()

            Button {
                store.endWalk(walk, note: nil, energy: nil, in: context)
            } label: {
                Text("結束散步")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.alertRed)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)
        }
    }

    // MARK: - 狀態列（同步狀態與登出）

    private func syncNow() async {
        await store.sync.pushPending(userID: userID, in: context)
    }

    private var statusBar: some View {
        HStack {
            if store.sync.pendingCount > 0 {
                // 也可以手動點一下重試，不必等自動觸發
                Button { Task { await syncNow() } } label: {
                    Label(
                        store.sync.isSyncing ? "同步中…" : "\(store.sync.pendingCount) 筆待同步",
                        systemImage: "arrow.triangle.2.circlepath"
                    )
                    .font(.caption)
                    .foregroundStyle(Color.clay)
                }
            } else {
                Label("已同步", systemImage: "checkmark.icloud")
                    .font(.caption)
                    .foregroundStyle(Color.muted)
            }
            Spacer()
            Button("登出") { Task { try? await auth.signOut() } }
                .font(.caption)
                .foregroundStyle(Color.muted)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 8)
    }
}
