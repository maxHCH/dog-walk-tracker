<script setup lang="ts">
// Email + 密碼 登入 / 註冊（不依賴信箱連結，避免 rate limit / otp 過期）
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

type Mode = 'signin' | 'signup'
const mode = ref<Mode>('signin')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')

// 已登入則導回首頁
watchEffect(() => {
  if (user.value) router.replace('/')
})

const title = computed(() => (mode.value === 'signin' ? '登入' : '註冊'))

function toggleMode() {
  mode.value = mode.value === 'signin' ? 'signup' : 'signin'
  errorMsg.value = ''
  infoMsg.value = ''
}

async function submit() {
  errorMsg.value = ''
  infoMsg.value = ''
  if (password.value.length < 6) {
    errorMsg.value = '密碼至少需 6 個字元'
    return
  }
  loading.value = true
  try {
    if (mode.value === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
      })
      if (error) throw error
      // 成功後 watchEffect 會自動導回首頁
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
      })
      if (error) throw error
      // 若專案開啟 Email 驗證，session 會是 null，需到信箱點驗證信
      if (!data.session) {
        infoMsg.value = '註冊成功！請至信箱點擊驗證信後再登入。'
        mode.value = 'signin'
      }
    }
  } catch (e: any) {
    errorMsg.value = translateError(e?.message ?? '發生錯誤')
  } finally {
    loading.value = false
  }
}

// 把 Supabase 常見錯誤訊息轉成中文
function translateError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email 或密碼錯誤'
  if (/already registered|already exists/i.test(msg)) return '此 Email 已註冊，請直接登入'
  if (/email.*not confirmed/i.test(msg)) return '此帳號尚未完成 Email 驗證'
  if (/rate limit/i.test(msg)) return '操作太頻繁，請稍後再試'
  return msg
}
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center px-6">
    <div class="mb-8 text-center">
      <div class="text-6xl">🐕</div>
      <h1 class="mt-3 text-2xl font-bold text-walk">狗狗散步記錄</h1>
      <p class="mt-1 text-sm text-gray-500">記錄散步與便便，AI 守護毛孩健康</p>
    </div>

    <form class="w-full max-w-sm space-y-3" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="Email"
        class="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-base focus:border-walk focus:outline-none"
      >
      <input
        v-model="password"
        type="password"
        :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
        placeholder="密碼（至少 6 字元）"
        class="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-base focus:border-walk focus:outline-none"
      >

      <button
        type="submit"
        class="btn w-full bg-walk text-white"
        :disabled="loading || !email || !password"
      >
        {{ loading ? '處理中…' : title }}
      </button>
    </form>

    <p v-if="errorMsg" class="mt-3 text-center text-sm text-alert">{{ errorMsg }}</p>
    <p v-if="infoMsg" class="mt-3 max-w-sm rounded-xl bg-walk-bg px-4 py-3 text-center text-sm text-walk">
      {{ infoMsg }}
    </p>

    <button
      type="button"
      class="mt-6 text-sm text-gray-500 underline underline-offset-4"
      @click="toggleMode"
    >
      {{ mode === 'signin' ? '還沒有帳號？前往註冊' : '已有帳號？前往登入' }}
    </button>
  </main>
</template>
