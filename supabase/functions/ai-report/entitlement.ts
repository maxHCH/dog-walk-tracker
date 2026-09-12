// 訂閱與配額把關（階段 6 才會真正啟用）。
//
// 為什麼一定要做在這裡、不能只做在前端：
// 每呼叫一次 Claude 都是真的花錢。前端的 paywall 只是體驗，
// 有人自己組一個 request 打過來就能白嫖。伺服器端這一關才是真的鎖。
//
// 現在預設是關的（AI_PAYWALL_ENABLED 沒設 = 全放行），所以行為跟搬家前一模一樣。
// 階段 6 接上 StoreKit 之後：
//   1. 跑 supabase/migrations/007_subscriptions.sql 建表
//   2. supabase secrets set AI_PAYWALL_ENABLED=true
// 就會開始擋。

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** 免費用戶一輩子可以產幾份報告（拿來當轉換 hook：先看過才知道值不值得付錢） */
const FREE_LIFETIME_REPORTS = 1
/** 訂閱用戶每 7 天可以產幾份（防止有人狂按「重新產生」把毛利吃光） */
const SUBSCRIBER_REPORTS_PER_WEEK = 4

const PAYWALL_ENABLED = Deno.env.get('AI_PAYWALL_ENABLED') === 'true'

export type Gate =
  | { allowed: true }
  | { allowed: false; status: number; message: string }

/** 數某個時間點之後，這位使用者產過幾份報告 */
async function countReportsSince(
  supabase: SupabaseClient,
  sinceIso: string | null,
): Promise<number> {
  let q = supabase.from('ai_reports').select('id', { count: 'exact', head: true })
  if (sinceIso) q = q.gte('generated_at', sinceIso)
  const { count, error } = await q
  if (error) throw new Error(`讀取報告次數失敗：${error.message}`)
  return count ?? 0
}

/**
 * 檢查這位使用者現在可不可以產新報告。
 * supabase 必須是「帶著使用者 JWT」的 client，RLS 會自動只算到他自己的資料。
 */
export async function checkEntitlement(supabase: SupabaseClient): Promise<Gate> {
  if (!PAYWALL_ENABLED) return { allowed: true }

  // 有沒有還沒到期的訂閱
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('expires_at')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error) throw new Error(`讀取訂閱狀態失敗：${error.message}`)

  if (!sub) {
    // 免費用戶：只給 FREE_LIFETIME_REPORTS 份
    const used = await countReportsSince(supabase, null)
    if (used >= FREE_LIFETIME_REPORTS) {
      return {
        allowed: false,
        status: 402, // Payment Required——前端看到這個就跳 paywall
        message: '免費的健康報告已使用完畢，訂閱後可持續追蹤狗狗的健康趨勢。',
      }
    }
    return { allowed: true }
  }

  // 訂閱用戶：每 7 天配額
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const usedThisWeek = await countReportsSince(supabase, weekAgo)
  if (usedThisWeek >= SUBSCRIBER_REPORTS_PER_WEEK) {
    return {
      allowed: false,
      status: 429,
      message: `本週已產生 ${usedThisWeek} 份報告，達到上限。下週再來看看新的趨勢吧！`,
    }
  }
  return { allowed: true }
}
