<script setup lang="ts">
// 數字摘要卡片（計劃書 §4 StatsCard）
type Tone = 'walk' | 'poop' | 'ai' | 'alert'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  unit?: string
  emoji?: string
  tone?: Tone
}>(), { tone: 'walk' })

const toneClass = computed(() => ({
  walk: 'bg-walk-bg text-walk',
  poop: 'bg-poop-bg text-poop',
  ai: 'bg-ai-bg text-ai',
  alert: 'bg-alert-bg text-alert',
}[props.tone]))
</script>

<template>
  <div class="rounded-2xl p-4" :class="toneClass">
    <div class="flex items-center gap-1.5 text-sm font-medium opacity-80">
      <span v-if="emoji">{{ emoji }}</span>
      <span>{{ label }}</span>
    </div>
    <div class="mt-1 flex items-baseline gap-1">
      <span class="text-3xl font-bold tabular-nums">{{ value }}</span>
      <span v-if="unit" class="text-sm font-medium opacity-70">{{ unit }}</span>
    </div>
  </div>
</template>
