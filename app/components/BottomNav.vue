<script setup lang="ts">
// 底部導覽列；「散步中」時在散步分頁顯示提示點（計劃書 §5.1）
const { isWalking } = useWalk()

const items = [
  { to: '/', label: '首頁', emoji: '🏠' },
  { to: '/walk', label: '散步', emoji: '🐕', walk: true },
  { to: '/history', label: '歷史', emoji: '📅' },
  { to: '/analysis', label: 'AI', emoji: '🤖' },
]
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
  >
    <div class="mx-auto flex max-w-md">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs"
        active-class="text-walk font-semibold"
        exact-active-class="text-walk font-semibold"
      >
        <span class="text-xl">{{ item.emoji }}</span>
        <span>{{ item.label }}</span>
        <span
          v-if="item.walk && isWalking"
          class="absolute right-[28%] top-2 h-2 w-2 animate-pulse rounded-full bg-alert"
        />
      </NuxtLink>
    </div>
  </nav>
</template>
