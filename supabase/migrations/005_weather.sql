-- =============================================================
-- 散步天氣：在 walk_sessions 增加 weather_json
-- 散步開始時依 GPS 經緯度向 Open-Meteo 取「當下天氣」（免 API key），
-- 結束畫面可手動覆寫。內容形如：
--   { "code": 2, "status": "partly", "tempC": 28.3, "humidity": 65 }
-- 抓不到（未授權定位／離線／請求失敗）時為 null，不影響散步。
-- =============================================================
alter table public.walk_sessions
  add column if not exists weather_json jsonb;
