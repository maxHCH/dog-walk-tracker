import SwiftUI

// 根畫面：依登入狀態決定顯示什麼。
// 對照網頁版的 app.vue + @nuxtjs/supabase 的 redirectOptions。
struct ContentView: View {
    @Environment(AuthModel.self) private var auth

    var body: some View {
        Group {
            if auth.isRestoring {
                // 還在從 Keychain 還原登入狀態，先鋪底色避免閃白畫面
                // （對照網頁版在 html 上先鋪奶油色的處理）
                Color.cream.ignoresSafeArea()
            } else if let userID = auth.userID {
                WalkView(userID: userID)
            } else {
                LoginView()
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthModel())
        .environment(WalkStore())
}
