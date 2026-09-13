import SwiftUI

// 登入／註冊。移植自 web/app/pages/login.vue。
// 用 Email + 密碼，不依賴信箱連結，避免 rate limit / otp 過期。
struct LoginView: View {
    @Environment(AuthModel.self) private var auth

    private enum Mode { case signIn, signUp }

    @State private var mode: Mode = .signIn
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var errorMsg = ""
    @State private var infoMsg = ""

    private var title: String { mode == .signIn ? "登入" : "註冊" }
    private var canSubmit: Bool { !loading && !email.isEmpty && !password.isEmpty }

    var body: some View {
        ZStack {
            Color.cream.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                fields
                messages
                toggleModeButton
            }
            .padding(.horizontal, 24)
            .frame(maxWidth: 420)
        }
    }

    private var header: some View {
        VStack(spacing: 0) {
            Image(systemName: "dog")
                .font(.system(size: 52))
                .foregroundStyle(Color.walk)
            Text("DOG WALK TRACKER")
                .font(.caption.weight(.semibold))
                .tracking(2.5)
                .foregroundStyle(Color.clay)
                .padding(.top, 16)
            Text("狗狗散步記錄")
                .font(.system(size: 30, weight: .semibold, design: .serif))
                .foregroundStyle(Color.ink)
                .padding(.top, 8)
            Text("記錄散步與便便，AI 守護毛孩健康")
                .font(.subheadline)
                .foregroundStyle(Color.muted)
                .padding(.top, 8)
        }
        .padding(.bottom, 36)
    }

    private var fields: some View {
        VStack(spacing: 12) {
            TextField("Email", text: $email)
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .fieldStyle()

            SecureField("密碼（至少 6 字元）", text: $password)
                .textContentType(mode == .signIn ? .password : .newPassword)
                .fieldStyle()

            Button(action: submit) {
                Text(loading ? "處理中…" : title)
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .background(Color.walk.opacity(canSubmit ? 1 : 0.5))
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(!canSubmit)
        }
    }

    @ViewBuilder
    private var messages: some View {
        if !errorMsg.isEmpty {
            Text(errorMsg)
                .font(.subheadline)
                .foregroundStyle(Color.alertRed)
                .multilineTextAlignment(.center)
                .padding(.top, 12)
        }
        if !infoMsg.isEmpty {
            Text(infoMsg)
                .font(.subheadline)
                .foregroundStyle(Color.walk)
                .multilineTextAlignment(.center)
                .padding(14)
                .background(Color.walkBg)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .padding(.top, 12)
        }
    }

    private var toggleModeButton: some View {
        Button {
            mode = mode == .signIn ? .signUp : .signIn
            errorMsg = ""
            infoMsg = ""
        } label: {
            Text(mode == .signIn ? "還沒有帳號？前往註冊" : "已有帳號？前往登入")
                .font(.subheadline)
                .foregroundStyle(Color.muted)
                .underline()
        }
        .padding(.top, 24)
    }

    private func submit() {
        errorMsg = ""
        infoMsg = ""
        guard password.count >= 6 else {
            errorMsg = "密碼至少需 6 個字元"
            return
        }
        loading = true
        Task {
            defer { loading = false }
            let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
            do {
                if mode == .signIn {
                    // 成功後 authStateChanges 會送出 .signedIn，root view 自動換頁
                    try await auth.signIn(email: trimmed, password: password)
                } else {
                    let signedIn = try await auth.signUp(email: trimmed, password: password)
                    if !signedIn {
                        infoMsg = "註冊成功！請至信箱點擊驗證信後再登入。"
                        mode = .signIn
                    }
                }
            } catch {
                errorMsg = translate(error)
            }
        }
    }

    /// 把 Supabase 常見錯誤訊息轉成中文（對應 login.vue 的 translateError）
    private func translate(_ error: Error) -> String {
        let msg = error.localizedDescription
        let lower = msg.lowercased()
        if lower.contains("invalid login credentials") { return "Email 或密碼錯誤" }
        if lower.contains("already registered") || lower.contains("already exists") {
            return "此 Email 已註冊，請直接登入"
        }
        if lower.contains("not confirmed") { return "此帳號尚未完成 Email 驗證" }
        if lower.contains("rate limit") { return "操作太頻繁，請稍後再試" }
        return msg
    }
}

private extension View {
    /// 對應網頁版輸入框的樣式
    func fieldStyle() -> some View {
        self
            .font(.body)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.ink.opacity(0.1), lineWidth: 1)
            )
    }
}

#Preview {
    LoginView()
        .environment(AuthModel())
}
