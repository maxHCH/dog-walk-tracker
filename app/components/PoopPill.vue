<script setup lang="ts">
import type { Consistency, PoopColor } from '~/types/database'
import { colorMeta, consistencyMeta } from '~/utils/poop'

// 性狀標籤元件（計劃書 §4 PoopPill）
const props = defineProps<{
  consistency: Consistency
  color: PoopColor
}>()

const c = computed(() => consistencyMeta(props.consistency))
const col = computed(() => colorMeta(props.color))
const abnormal = computed(() => c.value.abnormal || col.value.abnormal)
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
    :class="abnormal ? 'bg-alert-bg text-alert' : 'bg-poop-bg text-poop'"
  >
    <span class="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" :style="{ backgroundColor: col.swatch }" />
    <span>{{ c.label }}</span>
    <span class="opacity-60">·</span>
    <span>{{ col.label }}</span>
  </span>
</template>
