<script setup lang="ts">
import { diffSec, formatDuration } from '~/utils/time'

// 計時器元件（計劃書 §4 WalkTimer）
// 以 started_at 為基準計算經過秒數，每秒重算 → 切到背景再回來也準確。
const props = defineProps<{ startedAt: string }>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => clearInterval(timer))

const elapsed = computed(() => formatDuration(diffSec(props.startedAt, now.value)))
// 滿一小時後變成 H:MM:SS，窄螢幕會超出寬度 → 縮一級字
const sizeClass = computed(() => (elapsed.value.length > 5 ? 'text-6xl' : 'text-7xl'))
</script>

<template>
  <div class="text-center">
    <div class="text-sm font-medium text-walk">散步中</div>
    <div class="mt-2 font-bold tabular-nums text-walk leading-none" :class="sizeClass">
      {{ elapsed }}
    </div>
  </div>
</template>
