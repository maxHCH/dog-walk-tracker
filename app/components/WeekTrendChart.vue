<script setup lang="ts">
import type { DayBar } from '~/composables/useStats'

// 近 7 天散步趨勢：長條高度 ∝ 當日總時長（分鐘），條上標散步次數。
// 純 CSS flex，無外部繪圖庫，離線可用。
const props = defineProps<{ days: DayBar[] }>()

const maxSec = computed(() => Math.max(60, ...props.days.map((d) => d.durationSec)))

function heightPct(sec: number): number {
  return Math.round((sec / maxSec.value) * 100)
}
function minutes(sec: number): number {
  return Math.round(sec / 60)
}
</script>

<template>
  <div class="flex items-end justify-between gap-1.5" style="height: 96px">
    <div
      v-for="d in props.days"
      :key="d.date"
      class="flex flex-1 flex-col items-center justify-end gap-1"
    >
      <span class="text-[10px] font-medium tabular-nums text-walk" :class="{ 'opacity-0': !d.durationSec }">
        {{ minutes(d.durationSec) }}
      </span>
      <div class="flex w-full items-end justify-center" style="height: 56px">
        <div
          class="w-full max-w-[22px] rounded-md transition-all"
          :class="d.durationSec ? 'bg-walk' : 'bg-gray-200'"
          :style="{ height: `${Math.max(d.durationSec ? 8 : 4, heightPct(d.durationSec) * 0.56)}px` }"
        />
      </div>
      <span class="text-[11px] text-gray-400">{{ d.label }}</span>
    </div>
  </div>
</template>
