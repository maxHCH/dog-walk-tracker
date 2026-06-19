# 🐕 狗狗散步記錄 Dog Walk Tracker

手機優先的散步 & 排便健康記錄 App，搭配 Claude AI 趨勢分析。
Nuxt 4 + Vue 3 + Tailwind + Supabase。

## 開發進度

| 階段 | 狀態 | 內容 |
|------|------|------|
| **Phase 1** | ✅ 已完成 | Email 登入、散步計時、一鍵便便記錄、今日摘要首頁 |
| **Phase 2** | ✅ 已完成 | 歷史列表（依日期分組）、近 7 天趨勢/性狀/顏色長條圖、刪除散步、GPS 距離/路線追蹤、結束散步備註、**PWA（可安裝＋離線）** |
| Phase 3 | ⏳ 規劃 | Claude AI 週報、異常警示（`/analysis` 佔位頁已建） |

## PWA

以 `@vite-pwa/nuxt` 提供可安裝與離線能力：

- **可安裝**：`<VitePwaManifest />`（於 `app.vue`）注入 manifest，icon 於 `public/pwa-*.png`。
  Android/桌面會跳出安裝提示（`PwaPrompt.vue`）；iOS 請用 Safari「加入主畫面」。
- **離線**：SW precache app shell（JS/CSS/icon）；導覽走 NetworkFirst，造訪過的頁面離線可開。
  SSR 無預先產生的 `index.html`，故停用 `navigateFallback`（見 `nuxt.config.ts` 註解）。
- **icon 產生**（macOS，無需額外套件）：`qlmanage` 渲染 `public/icon.svg` → `sips` 縮放各尺寸。
- GPS 為純前端 `watchPosition`，離線可用；未授權定位時自動降級為僅計時。

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
├── components/   WalkTimer, WalkEndSheet, PoopForm, PoopPill, StatsCard, BottomNav,
│                 WeekTrendChart, DistChart, RouteThumb, PwaPrompt
├── composables/  useWalk, usePoop, useToday, useGeo, useHistory, useStats
├── pages/        index, walk, history, analysis, login, confirm
├── types/        database.ts（Supabase 型別）
└── utils/        poop.ts（性狀/顏色設定）, time.ts, geo.ts（haversine/路線投影）
public/           icon.svg, pwa-192/512, apple-touch-icon, favicon
supabase/migrations/001_init.sql
```
