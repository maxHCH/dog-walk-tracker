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
            } else if auth.isSignedIn {
                SignedInPlaceholderView()
            } else {
                LoginView()
            }
        }
    }
}

// 暫時的佔位畫面。M1 的下一步會換成散步計時畫面。
struct SignedInPlaceholderView: View {
    @Environment(AuthModel.self) private var auth

    var body: some View {
        ZStack {
            Color.cream.ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.walk)
                Text("已登入")
                    .font(.system(size: 26, weight: .semibold, design: .serif))
                    .foregroundStyle(Color.ink)
                if let email = auth.userEmail {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(Color.muted)
                }
                Button("登出") {
                    Task { try? await auth.signOut() }
                }
                .font(.body.weight(.semibold))
                .foregroundStyle(Color.alertRed)
                .padding(.top, 8)
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthModel())
}
