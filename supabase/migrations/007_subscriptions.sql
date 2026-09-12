-- =============================================================
-- 訂閱狀態（階段 6：接上 App Store 訂閱時才需要跑）
--
-- 資料來源是 Apple，不是 App：使用者在 App 內購買後，Apple 會把續訂／
-- 取消／退款的通知送到 App Store Server Notifications，由一支 Edge Function
-- 以 service role 寫入這張表。App 本身只讀不寫——因為 client 說的話不能信。
--
-- ai-report Edge Function 讀這張表決定要不要放行（見 entitlement.ts）。
--
-- 現在還不用跑這支 migration，ai-report 在 AI_PAYWALL_ENABLED 沒開時
-- 根本不會碰到 subscriptions 表。
-- =============================================================
create table if not exists public.subscriptions (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  product_id              text not null,
  -- active / expired / in_grace_period / revoked（退款）
  status                  text not null default 'active',
  -- 到期時間。續訂成功會往後推；判斷有沒有權限一律看這個欄位，不看 status。
  expires_at              timestamptz not null,
  -- Apple 的原始交易 ID：同一條訂閱鏈在續訂後仍然相同，用來對帳與防重複
  original_transaction_id text unique,
  updated_at              timestamptz not null default now()
);

create index if not exists subscriptions_expires_idx
  on public.subscriptions (expires_at desc);

-- RLS：使用者只能「讀」自己的訂閱狀態。
-- 沒有 insert/update/delete policy = 任何一般使用者都寫不進來，
-- 只有繞過 RLS 的 service role（webhook）能寫。這正是我們要的。
alter table public.subscriptions enable row level security;
create policy "read_own_subscription" on public.subscriptions
  for select
  using (auth.uid() = user_id);
