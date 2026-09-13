<script setup lang="ts">
import type { RoutePoint } from '~/utils/geo'
import { routeToPolyline } from '~/utils/geo'

// 把 route_json 畫成 SVG 路線縮圖（無地圖磚，離線可用）。
// 起點綠點、終點旗子色點。route 點數 < 2 時不顯示。
const props = withDefaults(defineProps<{
  route: RoutePoint[] | null | undefined
  width?: number
  height?: number
}>(), { width: 96, height: 72 })

const points = computed(() =>
  routeToPolyline(props.route ?? [], props.width, props.height),
)

const ends = computed(() => {
  const p = points.value.split(' ')
  if (p.length < 2) return null
  const first = p[0]!.split(',').map(Number)
  const last = p[p.length - 1]!.split(',').map(Number)
  return { start: first, end: last }
})
</script>

<template>
  <svg
    v-if="points"
    :width="props.width"
    :height="props.height"
    :viewBox="`0 0 ${props.width} ${props.height}`"
    class="rounded-lg bg-walk-bg"
  >
    <polyline
      :points="points"
      fill="none"
      stroke="#0F6E56"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle v-if="ends" :cx="ends.start[0]" :cy="ends.start[1]" r="3.5" fill="#0F6E56" />
    <circle v-if="ends" :cx="ends.end[0]" :cy="ends.end[1]" r="3.5" fill="#E24B4A" />
  </svg>
</template>
