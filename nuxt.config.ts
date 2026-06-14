// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',
  devtools: { enabled: true },

  devServer: { port: 3200 },

  modules: ['@nuxtjs/supabase', '@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

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
      ],
    },
  },
})
