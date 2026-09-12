// Edge Function 的 CORS 標頭。
// 瀏覽器（網頁版）呼叫 functions.invoke() 時會先送一個 OPTIONS preflight，
// 沒有這段就會被瀏覽器擋下來。原生 App 不受 CORS 限制，但留著不影響。
//
// Allow-Origin 開 '*' 是安全的：這支函式的授權完全靠 Authorization 標頭裡的
// JWT，不靠來源網域判斷。

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** 統一的 JSON 回應（自動帶上 CORS 標頭） */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** 錯誤回應：body 固定是 { error: string }，前端統一讀這個欄位 */
export function fail(message: string, status: number): Response {
  return json({ error: message }, status)
}
