// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',
  devtools: { enabled: true },

  devServer: { port: 3200 },

  modules: ['@nuxtjs/supabase', '@nuxtjs/tailwindcss', '@vite-pwa/nuxt', '@nuxt/icon'],

  css: ['~/assets/css/main.css'],

  // 圖示：Lucide（本地 @iconify-json/lucide，離線可用）+ 自訂單色便便
  icon: {
    serverBundle: 'local',
    customCollections: [
      { prefix: 'app', dir: './app/assets/icons' },
    ],
  },

  // PWA：可安裝（manifest + icon）＋ 離線（precache app shell，導覽走 NetworkFirst）
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '狗狗散步記錄',
      short_name: '散步記錄',
      description: '散步計時、便便健康記錄與趨勢分析',
      lang: 'zh-TW',
      theme_color: '#0F6E56',
      // 與 app 實際底色一致（奶油色），PWA 啟動畫面不會先閃別的顏色
      background_color: '#F4EEE1',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      // SSR 沒有預先產生的 index.html。明確設 undefined 關閉 @vite-pwa 預設的
      // navigateFallback: '/'（否則會註冊一個指向未被 precache 的 '/' 的
      // NavigationRoute，離線導覽會卡住）。改用下方 NetworkFirst：
      // 線上優先取最新、離線時回落到先前造訪過並快取的頁面。
      navigateFallback: undefined,
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            networkTimeoutSeconds: 3,
            expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 },
          },
        },
      ],
    },
    client: { installPrompt: true },
    // dev 不啟用 SW，避免干擾熱更新
    devOptions: { enabled: false, suppressWarnings: true },
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    // 未登入時自動導向 /login，登入後可存取受保護頁面
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login', '/confirm'],
    },
  },

  runtimeConfig: {
    // 僅 server 端可讀取（不會洩漏到 client bundle）
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  },

  app: {
    head: {
      title: '狗狗散步記錄',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      // 關鍵內聯樣式：在打包 CSS 載入前就替 html 鋪上奶油底色，
      // 避免冷啟動／深色模式下先閃一下黑畫面。
      style: [{ children: 'html{background:#f4eee1}' }],
      meta: [
        { name: 'theme-color', content: '#0F6E56' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: '散步記錄' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        // 編輯風襯線字體（支援繁中），CJK 由 Google Fonts 依字元動態子集化
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },
})
