import SwiftUI

// 色彩系統：對應 web/tailwind.config.ts，讓兩個 client 視覺一致。
// 現在用硬編碼的 hex 是為了好讀好改；之後要支援深色模式時，
// 會改成 Assets.xcassets 的 Color Set（那才是 iOS 的正規做法）。

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }

    static let walk = Color(hex: 0x0F6E56)
    static let walkBg = Color(hex: 0xE4F1EA)
    static let poop = Color(hex: 0xB0701A)
    static let poopBg = Color(hex: 0xF6EAD6)
    // 命名為 alertRed，避免和 SwiftUI 的 .alert 修飾器造成閱讀混淆
    static let alertRed = Color(hex: 0xD2483F)
    static let alertBg = Color(hex: 0xF8E7E2)
    static let cream = Color(hex: 0xF4EEE1)
    static let surface = Color(hex: 0xFCFAF4)
    static let ink = Color(hex: 0x262217)
    static let muted = Color(hex: 0x7A6F5B)
    static let clay = Color(hex: 0x9E6B2F)
}
