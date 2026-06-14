<script setup lang="ts">
// Email Magic Link + Google OAuth 登入（計劃書 §8 Phase 1-2）
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const email = ref('')
const sent = ref(false)
const loading = ref(false)
const errorMsg = ref('')

// 已登入則導回首頁
watchEffect(() => {
  if (user.value) router.replace('/')
})

async function sendMagicLink() {
  errorMsg.value = ''
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value.trim(),
      options: { emailRedirectTo: `${window.location.origin}/confirm` },
    })
    if (error) throw error
    sent.value = true
  } catch (e: any) {
    errorMsg.value = e?.message ?? '寄送失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

async function signInGoogle() {
  errorMsg.value = ''
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/confirm` },
  })
  if (error) errorMsg.value = error.message
}
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center px-6">
    <div class="mb-8 text-center">
      <div class="text-6xl">🐕</div>
      <h1 class="mt-3 text-2xl font-bold text-walk">狗狗散步記錄</h1>
      <p class="mt-1 text-sm text-gray-500">記錄散步與便便，AI 守護毛孩健康</p>
    </div>

    <div class="w-full max-w-sm space-y-3">
      <template v-if="!sent">
        <input
          v-model="email"
          type="email"
          inputmode="email"
          placeholder="你的 Email"
          class="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-base focus:border-walk focus:outline-none"
        >
        <button
          class="btn w-full bg-walk text-white"
          :disabled="loading || !email"
          @click="sendMagicLink"
        >
          {{ loading ? '寄送中…' : '寄送登入連結' }}
        </button>

        <div class="flex items-center gap-3 py-1 text-xs text-gray-400">
          <span class="h-px flex-1 bg-gray-200" /> 或 <span class="h-px flex-1 bg-gray-200" />
        </div>

        <button class="btn w-full border border-gray-200 bg-white text-gray-700" @click="signInGoogle">
          使用 Google 登入
        </button>
      </template>

      <p v-else class="rounded-xl bg-walk-bg px-4 py-3 text-center text-sm text-walk">
        登入連結已寄到 <strong>{{ email }}</strong>，請至信箱點擊。
      </p>

      <p v-if="errorMsg" class="text-center text-sm text-alert">{{ errorMsg }}</p>
    </div>
  </main>
</template>
