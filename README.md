# 🐕 狗狗散步記錄 Dog Walk Tracker

手機優先的散步 & 排便健康記錄 App，搭配 Claude AI 趨勢分析。
Nuxt 4 + Vue 3 + Tailwind + Supabase。

## 開發進度

| 階段 | 狀態 | 內容 |
|------|------|------|
| **Phase 1** | ✅ 已完成 | Email/Google 登入、散步計時、一鍵便便記錄、今日摘要首頁 |
| Phase 2 | ⏳ 規劃 | 歷史列表、7 天統計、性狀長條圖（`/history` 佔位頁已建） |
| Phase 3 | ⏳ 規劃 | Claude AI 週報、異常警示（`/analysis` 佔位頁已建） |

## 環境設定

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **建立 Supabase 專案**，於 SQL Editor 執行 [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
   建立三張表與 RLS。Auth → Providers 啟用 Email 與 Google。

3. **設定 `.env`**（複製 `.env.example`）
   ```bash
   cp .env.example .env
   ```
   填入 `SUPABASE_URL`、`SUPABASE_KEY`（anon key）、`ANTHROPIC_API_KEY`。

4. **啟動**
   ```bash
   npm run dev
   ```

## 指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 本機開發伺服器 |
| `npm run build` | production 建置 |
| `npm run typecheck` | 型別檢查 |

## 與計劃書的差異 / 修正

- **RLS 加上 `WITH CHECK`**：原計劃只有 `USING`，INSERT 不會被防護。已改為 `FOR ALL ... USING ... WITH CHECK`。
- **`poop_logs` 補 `created_at`**，FK 設 `ON DELETE CASCADE`（刪散步連帶清便便）。
- **`@anthropic-ai/sdk` 改為 runtime 依賴**（server route 執行期需要），非 devDependency。
- **不需手寫 `plugins/supabase.ts`**：`@nuxtjs/supabase` 已自動注入 `useSupabaseClient` / `useSupabaseUser`。
- **新增**：`walk_sessions` 對 `user_id` 建 partial unique index，確保同時只有一個進行中的散步。

## 目錄結構

```
app/
├── components/   WalkTimer, PoopForm, PoopPill, StatsCard, BottomNav
├── composables/  useWalk, usePoop, useToday
├── pages/        index, walk, history, analysis, login, confirm
├── types/        database.ts（Supabase 型別）
└── utils/        poop.ts（性狀/顏色設定）, time.ts
supabase/migrations/001_init.sql
```
