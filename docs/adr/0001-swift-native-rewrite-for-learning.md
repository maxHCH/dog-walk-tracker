---
status: accepted
date: 2026-09-13
---

# 改用 Swift 原生重寫，專案目標定為學習而非產品

本專案原為 Nuxt PWA，作者每天使用 1–2 次、功能已滿足自身需求，**重寫不解決任何
使用者問題**。之所以仍決定用 Swift + SwiftUI 原生重寫，唯一正當性是作者想學會
iOS 開發；驗收標準因此定為「看得懂並改得動 AI 產出的 code」＋「能自己除錯平台
問題」，而非「能從零寫出畫面」。既然目標是學習而非商業，**AI 健康週報的訂閱制
延後到免費版上架並實際運行一段時間之後**再評估。

## Considered Options

- **Capacitor 包殼**：最初的建議，因為能一份 code 同時出 iOS 與 Android。但確定
  **只上 Apple** 之後，跨平台是它唯一的價值，等於付抽象層的稅卻拿不到回報；而本
  App 最核心的背景 GPS 正好是包殼方案最脆弱之處（JS runtime 在背景會被 iOS 節流
  或殺掉）。且 Capacitor 會讓「學 Swift」這個目標完全落空。
- **維持 PWA 現狀**：成本為零，但 iOS 上拿不到鎖屏後的背景定位（現有
  `useWakeLock` 就是在繞過這個限制），也無法使用靈動島／Live Activity。
- **第一版就含訂閱**：否決。作者是這個功能動機最強、成本為零的使用者，實際使用
  頻率是**每月一次**；在此前提下要陌生人按月付費缺乏依據。另外 StoreKit 與
  App Store 訂閱審查（指南 3.1.2）教不了 iOS 開發核心能力，卻會在專案早期消耗
  大量動力。

## Consequences

- 網頁版**凍結**：維持運作、不再新增功能，避免重寫的追趕目標不斷後退。
- 上架仍要做，但目的是學習發布流程（簽章、App Store Connect、審查），不是商業。
  送審前必須補上**帳號刪除**功能（Apple 指南 5.1.1(v) 硬性要求，目前兩版都沒有）。
- `supabase/functions/ai-report/entitlement.ts` 與
  `supabase/migrations/007_subscriptions.sql` 已預先寫好但**預設關閉**
  （`AI_PAYWALL_ENABLED` 未設 = 全放行），待未來要開訂閱時才啟用。
- 最低支援 iOS 17+（作者使用 iPhone 15 Pro），以換取 SwiftData 與
  `CLBackgroundActivitySession`。
