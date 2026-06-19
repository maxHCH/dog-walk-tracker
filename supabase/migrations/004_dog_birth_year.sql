-- =============================================================
-- Dog Walk Tracker — 狗狗資料：改用「出生年」取代固定歲數
-- 只需填西元出生年（不必知道完整月日），歲數即可隨年份自動增長。
-- 歲數 = 今年 − 出生年（以日曆年計）。
-- =============================================================

-- 同時清掉前兩版的欄位（birthday 來自 002、age_years 來自 003），
-- 這樣即使略過 003 直接跑 004 也會回到正確狀態。
alter table public.dogs drop column if exists age_years;
alter table public.dogs drop column if exists birthday;

alter table public.dogs
  add column if not exists birth_year integer check (birth_year between 1985 and 2100);
