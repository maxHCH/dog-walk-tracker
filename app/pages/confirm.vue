<script setup lang="ts">
// OAuth / Magic Link 回呼頁：@nuxtjs/supabase 會在此交換 session，
// 完成後導回首頁。
const user = useSupabaseUser()
const router = useRouter()

watchEffect(() => {
  if (user.value) router.replace('/')
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center text-gray-500">
    登入中…
  </main>
</template>
