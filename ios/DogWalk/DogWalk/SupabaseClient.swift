import Foundation
import Supabase

// 全 App 共用的 Supabase client。
//
// 對照網頁版：這相當於 useSupabaseClient()。差別是網頁版由 Nuxt 模組注入，
// 這裡就是一個 Swift 的全域常數——Swift 保證全域常數是執行緒安全的延遲初始化。
//
// session 由 supabase-swift 自行保存（Apple 平台預設存在 Keychain），
// 所以 App 關掉重開仍然是登入狀態，不需要我們自己處理。
let supabase = SupabaseClient(
    supabaseURL: Secrets.supabaseURL,
    supabaseKey: Secrets.supabaseAnonKey
)
