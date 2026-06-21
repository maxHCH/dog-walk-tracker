<script setup lang="ts">
import type { DistItem } from '~/composables/useStats'

// 便便性狀 / 顏色分布的水平長條。異常項目以 alert 色標示。
const props = defineProps<{
  items: DistItem<string>[]
}>()

const total = computed(() => props.items.reduce((s, i) => s + i.count, 0))

function pct(count: number): number {
  return total.value ? Math.round((count / total.value) * 100) : 0
}
</script>

<template>
  <div v-if="total" class="space-y-2">
    <div v-for="it in props.items" :key="it.value" class="flex items-center gap-2">
      <span class="flex w-14 shrink-0 items-center gap-1.5 text-xs text-muted">
        <span
          v-if="it.swatch"
          class="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
          :style="{ backgroundColor: it.swatch }"
        />
        {{ it.label }}
      </span>
      <div class="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          class="h-full rounded-full transition-all"
          :class="it.abnormal ? 'bg-alert' : 'bg-walk'"
          :style="{ width: `${it.count ? Math.max(6, pct(it.count)) : 0}%` }"
        />
      </div>
      <span class="w-9 shrink-0 text-right text-xs tabular-nums text-gray-400">{{ it.count }}</span>
    </div>
  </div>
  <p v-else class="py-3 text-center text-xs text-gray-400">這 7 天還沒有便便記錄</p>
</template>
