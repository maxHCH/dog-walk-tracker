<script setup lang="ts">
// 底部導覽列；「散步中」時在散步分頁顯示提示點（計劃書 §5.1）
const { isWalking } = useWalk()

const items = [
  { to: '/', label: '首頁', icon: 'lucide:house' },
  { to: '/walk', label: '散步', icon: 'lucide:footprints', walk: true },
  { to: '/history', label: '歷史', icon: 'lucide:calendar-days' },
  { to: '/analysis', label: 'AI', icon: 'lucide:sparkles' },
]
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-ink/5 bg-cream/85 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
  >
    <div class="mx-auto flex max-w-md">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs text-muted"
        active-class="text-walk font-semibold"
        exact-active-class="text-walk font-semibold"
      >
        <Icon :name="item.icon" class="text-[1.35rem]" />
        <span>{{ item.label }}</span>
        <span
          v-if="item.walk && isWalking"
          class="absolute right-[28%] top-2 h-2 w-2 animate-pulse rounded-full bg-alert"
        />
      </NuxtLink>
    </div>
  </nav>
</template>
