-- =============================================================
-- 散步活力狀態：在 walk_sessions 增加 energy
-- 記錄狗狗這趟散步的主觀活力分級（結束畫面手動選）。
-- 四級：high 活力充沛 / normal 正常 / tired 累了 / low 不太動。
-- 其中 low（不太動）視為需注意的健康訊號，供 AI 週報解讀。
-- 未選時為 null，不影響散步。
-- =============================================================
alter table public.walk_sessions
  add column if not exists energy text
    check (energy in ('high', 'normal', 'tired', 'low'));
