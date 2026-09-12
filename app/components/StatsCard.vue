<script setup lang="ts">
// 數字摘要卡片（編輯風：icon chip + 襯線數字 + 小標籤）
type Tone = 'walk' | 'poop' | 'ai' | 'alert'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  unit?: string
  icon?: string
  tone?: Tone
}>(), { tone: 'walk' })

const chipClass = computed(() => ({
  walk: 'bg-walk-bg text-walk',
  poop: 'bg-poop-bg text-poop',
  ai: 'bg-ai-bg text-ai',
  alert: 'bg-alert-bg text-alert',
}[props.tone]))

// 值太長（如「1:25」「10:05」）時自動縮字級，避免兩欄卡片被撐破
const valueClass = computed(() => {
  const len = String(props.value).length
  if (len <= 3) return 'text-[1.75rem]'
  return len <= 5 ? 'text-[1.35rem]' : 'text-[1.1rem]'
})
</script>

<template>
  <div class="card p-4">
    <div class="flex items-center gap-3">
      <div
        v-if="icon"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        :class="chipClass"
      >
        <Icon :name="icon" class="text-[1.35rem]" />
      </div>
      <div class="min-w-0">
        <div class="flex items-baseline gap-1">
          <span
            class="font-serif font-semibold leading-none tabular-nums text-ink"
            :class="valueClass"
          >{{ value }}</span>
          <span v-if="unit" class="shrink-0 text-sm font-medium text-muted">{{ unit }}</span>
        </div>
        <div class="mt-1.5 truncate text-xs font-medium tracking-wide text-muted">{{ label }}</div>
      </div>
    </div>
  </div>
</template>
