# 🐕 狗狗散步記錄 Dog Walk Tracker

手機優先的散步 & 排便健康記錄 App，搭配 Claude AI 趨勢分析。
Nuxt 4 + Vue 3 + Tailwind + Supabase。

## 開發進度

| 階段 | 狀態 | 內容 |
|------|------|------|
| **Phase 1** | ✅ 已完成 | Email 登入、散步計時、一鍵便便記錄、今日摘要首頁 |
| **Phase 2** | ✅ 已完成 | 歷史列表（依日期分組）、近 7 天趨勢/性狀/顏色長條圖、刪除散步、GPS 距離/路線追蹤、結束散步備註、**PWA（可安裝＋離線）** |
| **Phase 3** | ✅ 已完成 | Claude AI 健康週報：分析近 7 天散步＋便便趨勢，產生健康摘要、建議與就醫警示（`/analysis`） |

## AI 健康週報（Phase 3）

- **on-demand**：使用者按鈕觸發 `POST /api/ai-report`（server route），結果快取於 `ai_reports`，前端讀最新一份；可「重新產生」。
- **API key 不外洩**：`ANTHROPIC_API_KEY` 只在 server 端使用（`runtimeConfig.anthropicApiKey`）。
- **模型**：`ANTHROPIC_MODEL`（預設 `claude-sonnet-4-6`；可設為 `claude-opus-4-8` 提升分析深度）。
- **結構化輸出**：用 forced tool use（相容 SDK 0.39）取得 summary／便便評估／活動評估／建議／異常／就醫旗標。
- **資料不足保護**：少於 2 天或記錄 < 3 筆時不分析，提示「多記幾天再來」，不亂掰。
- 不需新 migration（`ai_reports` 表已在 `001_init.sql`）。

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

2. **建立 Supabase 專案**，於 SQL Editor **依序**執行
   [`001_init.sql`](supabase/migrations/001_init.sql)（散步/便便/AI 報告三張表）、
   [`002_dogs.sql`](supabase/migrations/002_dogs.sql)（狗狗基本資料 `dogs` 表）、
   [`003_dog_age.sql`](supabase/migrations/003_dog_age.sql) 與
   [`004_dog_birth_year.sql`](supabase/migrations/004_dog_birth_year.sql)（`dogs` 改用出生年 `birth_year`，歲數自動增長），
   皆含 RLS。Auth → Providers 啟用 Email。

   > ⚠️ 未跑 `002`～`004` 時，App 仍可運作，但「狗狗資料」彈窗儲存會失敗。

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
│                 WeekTrendChart, DistChart, RouteThumb, PwaPrompt, DogProfileSheet
├── composables/  useWalk, usePoop, useToday, useGeo, useHistory, useStats, useDog, useAiReport
├── pages/        index, walk, history, analysis, login, confirm
├── types/        database.ts（Supabase 型別）
└── utils/        poop.ts（性狀/顏色設定）, time.ts, geo.ts（haversine/路線投影）,
                  dog.ts（年齡換算/性別）
server/api/       ai-report.post.ts（Claude 健康週報，server-only）
public/           icon.svg, pwa-192/512, apple-touch-icon, favicon
supabase/migrations/  001_init.sql, 002_dogs.sql, 003/004 狗狗欄位演進
```
