-- =============================================================
-- Dog Walk Tracker — 狗狗基本資料
-- 名字 / 性別 / 生日，供首頁打招呼與散步記錄顯示。
-- 目前一位使用者一隻狗（user_id unique），日後要多隻再放寬。
-- =============================================================

create table if not exists public.dogs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  gender      text check (gender in ('male', 'female')),
  birthday    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 一位使用者一隻狗（upsert onConflict 依賴此唯一性）
create unique index if not exists dogs_user_unique on public.dogs (user_id);

-- RLS：只能存取自己的狗
alter table public.dogs enable row level security;
create policy "own_data" on public.dogs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
