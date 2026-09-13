import SwiftUI

@main
struct DogWalkApp: App {
    // App 存活期間唯一的登入狀態來源。@State 在這裡是「擁有」這個物件的意思，
    // 再用 .environment 往下傳給所有子畫面（對照 Nuxt 的 useState 全域共享）。
    @State private var auth = AuthModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(auth)
                // 在最外層啟動監聽，App 活著就一直聽
                .task { await auth.observeAuthChanges() }
        }
    }
}
