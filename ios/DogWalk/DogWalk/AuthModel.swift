import Foundation
import Supabase

// 登入狀態。對照網頁版的 useSupabaseUser() + login.vue 的 submit()。
//
// @Observable 是 iOS 17 的觀察機制：被標註的類別，其屬性變動會自動觸發
// 有讀取該屬性的 SwiftUI 畫面重繪——概念上等同於 Vue 的 ref/reactive。
@Observable
@MainActor
final class AuthModel {
    /// 目前的登入 session；nil 表示未登入
    private(set) var session: Session?
    /// App 剛啟動時還在還原先前的登入狀態，此時不該閃一下登入畫面
    private(set) var isRestoring = true

    var isSignedIn: Bool { session != nil }

    /// 目前登入者的 Email。
    /// 刻意在這裡轉出字串，讓畫面層不必 import Supabase、也不必認識 Session 型別。
    var userEmail: String? { session?.user.email }

    /// 目前登入者的 id。所有本機查詢與寫入都要帶上它（本機版的 RLS）。
    var userID: UUID? { session?.user.id }

    /// 持續監聽登入狀態變化。由 root view 的 .task 啟動，App 存活期間不會結束。
    ///
    /// authStateChanges 一被訂閱就會先送出一個 .initialSession 事件
    /// （帶著從 Keychain 還原的 session，沒有就是 nil），
    /// 所以「還原既有登入」和「之後的登入/登出」走的是同一條路徑。
    func observeAuthChanges() async {
        for await (event, session) in supabase.auth.authStateChanges {
            self.session = session
            if event == .initialSession {
                isRestoring = false
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        try await supabase.auth.signIn(email: email, password: password)
    }

    /// - Returns: true 表示已直接登入；false 表示 Supabase 開了 Email 驗證，
    ///            需要去信箱點驗證信後才能登入。
    func signUp(email: String, password: String) async throws -> Bool {
        let response = try await supabase.auth.signUp(email: email, password: password)
        switch response {
        case .session: return true
        case .user: return false
        }
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
    }
}
