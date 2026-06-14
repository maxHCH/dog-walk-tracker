-- =============================================================
-- Dog Walk Tracker — 初始 schema
-- 計劃書 §3。修正：RLS 加上 WITH CHECK（INSERT 防護），
-- poop_logs 補 created_at，FK 設定 ON DELETE CASCADE。
-- =============================================================

-- 散步記錄 -----------------------------------------------------
create table if not exists public.walk_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  dog_name     text not null,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,                 -- null = 進行中
  duration_sec integer,
  distance_m   numeric,                      -- Phase 2 GPS
  route_json   jsonb,                        -- Phase 2 GPS
  note         text,
  created_at   timestamptz not null default now()
);

-- 同一使用者同時間只允許一個進行中的散步（ended_at is null）
create unique index if not exists walk_sessions_one_active
  on public.walk_sessions (user_id)
  where ended_at is null;

create index if not exists walk_sessions_user_started_idx
  on public.walk_sessions (user_id, started_at desc);

-- 便便記錄 -----------------------------------------------------
create table if not exists public.poop_logs (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.walk_sessions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  logged_at   timestamptz not null default now(),
  consistency text not null check (consistency in ('normal', 'soft', 'loose', 'hard')),
  color       text not null check (color in ('brown', 'yellow', 'black', 'red')),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists poop_logs_user_logged_idx
  on public.poop_logs (user_id, logged_at desc);
create index if not exists poop_logs_session_idx
  on public.poop_logs (session_id);

-- AI 分析報告 --------------------------------------------------
create table if not exists public.ai_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  generated_at  timestamptz not null default now(),
  period_start  date not null,
  period_end    date not null,
  summary       text,
  anomaly_flag  boolean not null default false,
  detail_json   jsonb
);

create index if not exists ai_reports_user_generated_idx
  on public.ai_reports (user_id, generated_at desc);

-- =============================================================
-- RLS：使用者只能存取自己的資料
-- USING 控管 SELECT/UPDATE/DELETE，WITH CHECK 控管 INSERT/UPDATE 寫入
-- =============================================================
alter table public.walk_sessions enable row level security;
create policy "own_data" on public.walk_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.poop_logs enable row level security;
create policy "own_data" on public.poop_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.ai_reports enable row level security;
create policy "own_data" on public.ai_reports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
