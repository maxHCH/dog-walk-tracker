// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',
  devtools: { enabled: true },

  devServer: { port: 3200 },

  modules: ['@nuxtjs/supabase', '@nuxtjs/tailwindcss', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  // PWA：可安裝（manifest + icon）＋ 離線（precache app shell，導覽走 NetworkFirst）
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '狗狗散步記錄',
      short_name: '散步記錄',
      description: '散步計時、便便健康記錄與趨勢分析',
      lang: 'zh-TW',
      theme_color: '#0F6E56',
      background_color: '#E1F5EE',
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
      ],
    },
  },
})
