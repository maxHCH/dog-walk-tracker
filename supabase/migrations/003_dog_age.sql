-- =============================================================
-- Dog Walk Tracker — 狗狗資料：改用「歲數」取代「生日」
-- 並非每位飼主都知道狗狗確切生日，但歲數較容易得知，
-- 故以 age_years（整數歲）取代 birthday。
-- =============================================================

alter table public.dogs drop column if exists birthday;

alter table public.dogs
  add column if not exists age_years integer check (age_years >= 0 and age_years <= 40);
