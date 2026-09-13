# 🐕 狗狗散步記錄 Dog Walk Tracker

手機優先的散步 & 排便健康記錄 App，搭配 Claude AI 趨勢分析。
Nuxt 4 + Vue 3 + Tailwind + Supabase。

## 開發進度

| 階段 | 狀態 | 內容 |
|------|------|------|
| **Phase 1** | ✅ 已完成 | Email 登入、散步計時、一鍵便便記錄、今日摘要首頁 |
| **Phase 2** | ✅ 已完成 | 歷史列表（依日期分組）、近 7 天趨勢/形狀/顏色長條圖、刪除散步、GPS 距離/路線追蹤、結束散步備註、**PWA（可安裝＋離線）** |
| **Phase 3** | ✅ 已完成 | Claude AI 健康週報：分析近 7 天散步＋便便趨勢，產生健康摘要、建議與就醫警示（`/analysis`） |

## 專案結構

```
web/        Nuxt PWA（已凍結，見 docs/adr/0001）
ios/        Swift 原生 App（開發中）
supabase/   migrations + Edge Functions —— 兩個 client 共用的契約層
docs/adr/   架構決策紀錄
```

> Vercel 部署的 Root Directory 需設為 `web`。

## AI 健康週報（Phase 3）

- **on-demand**：使用者按鈕觸發 Supabase Edge Function `ai-report`（`functions.invoke`），結果快取於 `ai_reports`，前端讀最新一份；可「重新產生」。
- **API key 不外洩**：`ANTHROPIC_API_KEY` 只存在 Supabase secrets，不在 repo、也不在 client bundle。
- **模型**：`ANTHROPIC_MODEL`（預設 `claude-sonnet-5`；可設為 `claude-opus-5` 提升分析深度）。
- **訂閱把關**：`entitlement.ts` 在呼叫 Claude 前檢查訂閱與配額，預設關閉（`AI_PAYWALL_ENABLED` 未設 = 全放行）。
- **結構化輸出**：用 forced tool use（相容 SDK 0.39）取得 summary／便便評估／活動評估／建議／異常／就醫旗標。
- **資料不足保護**：少於 2 天或記錄 < 3 筆時不分析，提示「多記幾天再來」，不亂掰。
- 不需新 migration（`ai_reports` 表已在 `001_init.sql`）。

## Supabase Edge Function

AI 分析跑在 Supabase Edge Function（Deno），不是 Nuxt server。這樣前端不論是網頁或
之後的原生 App，都打同一支後端。

```
supabase/functions/
  _shared/cors.ts          CORS 標頭與 JSON 回應
  ai-report/
    index.ts               HTTP handler：驗身分 → 把關 → 撈資料 → 問 Claude → 寫入
    aggregate.ts           近 7 天資料彙整（純函式）
    entitlement.ts         訂閱／配額把關（預設關閉）
```

**部署**（需先安裝 [Supabase CLI](https://supabase.com/docs/guides/cli)）：

```bash
supabase login
supabase link --project-ref <你的 project ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ai-report
```

查看線上 log：`supabase functions logs ai-report`

## PWA

以 `@vite-pwa/nuxt` 提供可安裝與離線能力：

- **可安裝**：`<VitePwaManifest />`（於 `app.vue`）注入 manifest，icon 於 `public/pwa-*.png`。
  Android/桌面會跳出安裝提示（`PwaPrompt.vue`）；iOS 請用 Safari「加入主畫面」。
- **離線**：SW precache app shell（JS/CSS/icon）；導覽走 NetworkFirst，造訪過的頁面離線可開。
  SSR 無預先產生的 `index.html`，故停用 `navigateFallback`（見 `nuxt.config.ts` 註解）。
- **icon 產生**（macOS，無需額外套件）：`qlmanage` 渲染 `public/icon.svg` → `sips` 縮放各尺寸。
- GPS 為純前端 `watchPosition`，離線可用；未授權定位時自動降級為僅計時。

## 環境設定

1. **安裝依賴**（Nuxt 專案位於 `web/`）
   ```bash
   cd web && npm install
   ```

2. **建立 Supabase 專案**，於 SQL Editor **依序**執行
   [`001_init.sql`](supabase/migrations/001_init.sql)（散步/便便/AI 報告三張表）、
   [`002_dogs.sql`](supabase/migrations/002_dogs.sql)（狗狗基本資料 `dogs` 表）、
   [`003_dog_age.sql`](supabase/migrations/003_dog_age.sql) 與
   [`004_dog_birth_year.sql`](supabase/migrations/004_dog_birth_year.sql)（`dogs` 改用出生年 `birth_year`，歲數自動增長），
   皆含 RLS。Auth → Providers 啟用 Email。

   > ⚠️ 未跑 `002`～`004` 時，App 仍可運作，但「狗狗資料」彈窗儲存會失敗。

3. **設定 `web/.env`**（複製 `web/.env.example`）
   ```bash
   cp .env.example .env
   ```
   填入 `SUPABASE_URL`、`SUPABASE_KEY`（anon key）。
   `ANTHROPIC_API_KEY` 不放這裡，見上方 Edge Function 章節。

4. **啟動**（於 `web/`）
   ```bash
   npm run dev
   ```

## 指令

於 `web/` 執行：

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
web/app/
├── components/   WalkTimer, WalkEndSheet, PoopForm, PoopPill, StatsCard, BottomNav,
│                 WeekTrendChart, DistChart, RouteThumb, PwaPrompt, DogProfileSheet
├── composables/  useWalk, usePoop, useToday, useGeo, useHistory, useStats, useDog, useAiReport
├── pages/        index, walk, history, analysis, login, confirm
├── types/        database.ts（Supabase 型別）
└── utils/        poop.ts（形狀/顏色設定）, time.ts, geo.ts（haversine/路線投影）,
                  dog.ts（年齡換算/性別）
web/public/       icon.svg, pwa-192/512, apple-touch-icon, favicon
supabase/functions/   ai-report（Claude 健康週報，Deno Edge Function）
supabase/migrations/  001_init.sql ~ 006_energy.sql，007_subscriptions.sql（未啟用）
```
