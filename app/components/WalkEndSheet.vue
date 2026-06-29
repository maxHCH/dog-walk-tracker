<script setup lang="ts">
import { formatDuration } from '~/utils/time'
import { formatDistance } from '~/utils/geo'
import type { Weather, WeatherStatus } from '~/utils/weather'
import { WEATHER_STATUSES, statusMeta, codeForStatus } from '~/utils/weather'

// 結束散步前的確認 sheet：顯示本次摘要 + 天氣（自動偵測，可手動改）+ 可選備註。
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  durationSec: number
  distanceM: number | null
  poopCount: number
  weather?: Weather | null
  weatherLoading?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{ confirm: [payload: { note: string; weather: Weather | null }] }>()

const note = ref('')
// 天氣：開啟時以偵測結果為預設，使用者可覆寫
const status = ref<WeatherStatus | null>(null)
const tempC = ref<number | null>(null)

watch(open, (v) => {
  if (!v) return
  note.value = ''
  status.value = props.weather?.status ?? null
  tempC.value = props.weather?.tempC ?? null
})

// 偵測較慢時（開啟後才回來），尚未手動選的話帶入偵測值
watch(() => props.weather, (w) => {
  if (open.value && status.value === null && w) {
    status.value = w.status
    tempC.value = w.tempC
  }
})

function buildWeather(): Weather | null {
  if (!status.value) return null
  // 狀態未改＝沿用偵測到的代表碼與濕度，否則用該狀態代表碼、濕度設 null
  const sameAsDetected = props.weather?.status === status.value
  return {
    status: status.value,
    code: sameAsDetected ? props.weather!.code : codeForStatus(status.value),
    tempC: tempC.value ?? null,
    humidity: sameAsDetected ? props.weather!.humidity : null,
  }
}

function onConfirm() {
  emit('confirm', { note: note.value, weather: buildWeather() })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end" @click.self="open = false">
        <div class="absolute inset-0 bg-black/40" @click="open = false" />
        <div class="relative w-full rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
          <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-ink/15" />
          <h2 class="flex items-center gap-1.5 text-lg font-bold text-walk">
            <Icon name="lucide:footprints" /> 結束這次散步
          </h2>

          <div class="mt-4 grid grid-cols-3 gap-2 text-center">
            <div class="rounded-2xl bg-walk-bg py-3">
              <div class="text-xs text-walk/70">時長</div>
              <div class="mt-0.5 font-bold tabular-nums text-walk">{{ formatDuration(props.durationSec) }}</div>
            </div>
            <div class="rounded-2xl bg-walk-bg py-3">
              <div class="text-xs text-walk/70">距離</div>
              <div class="mt-0.5 font-bold tabular-nums text-walk">{{ formatDistance(props.distanceM) }}</div>
            </div>
            <div class="rounded-2xl bg-poop-bg py-3">
              <div class="text-xs text-poop/70">便便</div>
              <div class="mt-0.5 font-bold tabular-nums text-poop">{{ props.poopCount }} 次</div>
            </div>
          </div>

          <!-- 天氣：自動偵測，可手動改 -->
          <div class="mt-4">
            <div class="mb-2 flex items-center gap-1.5 text-xs text-walk/70">
              <Icon name="lucide:cloud-sun" /> 散步天氣
              <span v-if="props.weatherLoading && status === null" class="text-muted">偵測中…</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="s in WEATHER_STATUSES"
                :key="s"
                type="button"
                class="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm transition-colors"
                :class="status === s ? 'bg-walk text-white' : 'bg-walk-bg text-walk'"
                @click="status = s"
              >
                <Icon :name="statusMeta(s).icon" /> {{ statusMeta(s).label }}
              </button>
            </div>
            <div class="mt-2.5 flex items-center gap-2">
              <Icon name="lucide:thermometer" class="text-walk/70" />
              <input
                v-model.number="tempC"
                type="number"
                inputmode="decimal"
                placeholder="溫度"
                class="w-24 rounded-xl border border-ink/10 px-3 py-2 text-base focus:border-walk focus:outline-none"
              >
              <span class="text-sm text-muted">°C</span>
            </div>
          </div>

          <input
            v-model="note"
            type="text"
            placeholder="這次散步的備註（可選）"
            class="mt-4 w-full rounded-xl border border-ink/10 px-3 py-3 text-base focus:border-walk focus:outline-none"
          >

          <div class="mt-5 flex gap-3">
            <button type="button" class="btn flex-1 bg-ink/5 text-ink" @click="open = false">
              繼續散步
            </button>
            <button
              type="button"
              class="btn flex-1 bg-alert text-white"
              :disabled="props.saving"
              @click="onConfirm"
            >
              {{ props.saving ? '結束中…' : '結束散步' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.2s ease; }
.sheet-enter-active > div:last-child, .sheet-leave-active > div:last-child { transition: transform 0.25s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from > div:last-child, .sheet-leave-to > div:last-child { transform: translateY(100%); }
</style>
