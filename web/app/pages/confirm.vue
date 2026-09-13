<script setup lang="ts">
// OAuth / Magic Link 回呼頁：@nuxtjs/supabase 會在此交換 session。
// 成功 → 導回首頁；失敗（連結過期/無效）→ 顯示錯誤而非卡在「登入中」。
const user = useSupabaseUser()
const router = useRouter()
const route = useRoute()

const errorMsg = ref('')

// Supabase 可能把錯誤放在 query 或 URL hash（#error=...）
function readError(): string {
  const fromQuery = (route.query.error_description || route.query.error) as string | undefined
  if (fromQuery) return decodeURIComponent(String(fromQuery).replace(/\+/g, ' '))
  // onMounted 僅在 client 端執行，window 必定存在
  if (window.location.hash) {
    const h = new URLSearchParams(window.location.hash.slice(1))
    const d = h.get('error_description') || h.get('error')
    if (d) return decodeURIComponent(d.replace(/\+/g, ' '))
  }
  return ''
}

onMounted(() => {
  const err = readError()
  if (err) {
    errorMsg.value = err.includes('expired') || err.includes('invalid')
      ? '登入連結已失效或被使用過，請重新取得一封新的登入信。'
      : err
    return
  }
  // 沒有錯誤但 3 秒內仍未建立 session → 提示重試，避免無限等待
  setTimeout(() => {
    if (!user.value && !errorMsg.value) {
      errorMsg.value = '登入逾時，請重新嘗試。'
    }
  }, 3000)
})

watchEffect(() => {
  if (user.value) router.replace('/')
})
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center px-6 text-center">
    <template v-if="errorMsg">
      <div class="text-5xl">⏰</div>
      <p class="mt-4 max-w-xs text-sm text-gray-600">{{ errorMsg }}</p>
      <NuxtLink to="/login" class="btn mt-6 w-56 bg-walk text-white">
        重新登入
      </NuxtLink>
    </template>
    <p v-else class="text-gray-500">登入中…</p>
  </main>
</template>
