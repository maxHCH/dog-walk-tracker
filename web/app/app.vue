<script setup lang="ts">
const user = useSupabaseUser()
const route = useRoute()
const { loadActive } = useWalk()
const { fetchDog } = useDog()

// 登入後恢復進行中的散步（App 重開繼續計時，§5.1）並載入狗狗資料
watch(user, (u) => {
  if (u) {
    loadActive().catch(() => {})
    fetchDog().catch(() => {})
  }
}, { immediate: true })

const showNav = computed(() => !!user.value && route.path !== '/login')
</script>

<template>
  <div class="mx-auto min-h-screen max-w-md" :class="showNav ? 'pb-20' : ''">
    <!-- 注入 <link rel="manifest">，讓 App 可安裝（@vite-pwa/nuxt 不會自動加） -->
    <VitePwaManifest />
    <NuxtPage />
    <BottomNav v-if="showNav" />
    <PwaPrompt v-if="user" />
  </div>
</template>
