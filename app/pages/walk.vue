<script setup lang="ts">
import type { PoopInput } from '~/composables/usePoop'
import type { PoopLog } from '~/types/database'
import type { Weather } from '~/utils/weather'
import { diffSec } from '~/utils/time'
import { formatDistance } from '~/utils/geo'

// 散步進行中畫面（計劃書 §4 walk.vue）
const { active, isWalking, loading, startWalk, setWeather, endWalk } = useWalk()
const { logPoop, poopsForSession } = usePoop()
const { dog } = useDog()
const geo = useGeo()
const weather = useWeather()
const wakeLock = useWakeLock()
const router = useRouter()

const sheetOpen = ref(false)
const endSheetOpen = ref(false)
const poops = ref<PoopLog[]>([])
const errorMsg = ref('')
// 本次散步天氣（開始時自動抓，結束畫面顯示／可改）
const currentWeather = ref<Weather | null>(null)

// 進入頁面：若已有進行中的散步，載入便便記錄並開始 GPS 追蹤
watch(active, async (s) => {
  if (s) {
    poops.value = await poopsForSession(s.id)
    // App 重開回到進行中的散步：還原先前抓到的天氣
    currentWeather.value = (s.weather_json as Weather | null) ?? currentWeather.value
    if (geo.status.value === 'idle') geo.start()
    wakeLock.request() // 散步中保持螢幕亮，避免頁面凍結中斷 GPS
  } else {
    poops.value = []
    wakeLock.release()
  }
}, { immediate: true })

// GPS 提示文字
const geoHint = computed(() => {
  switch (geo.status.value) {
    case 'denied': return '未授權定位，僅計時'
    case 'unsupported': return '裝置不支援定位'
    case 'error': return '定位訊號不佳'
    default: return null
  }
})

// 結束 sheet 用的本次時長（每秒更新）
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined
onMounted(() => { ticker = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(ticker))
const liveDurationSec = computed(() =>
  active.value ? diffSec(active.value.started_at, now.value) : 0,
)

async function onStart() {
  errorMsg.value = ''
  try {
    await startWalk(dog.value?.name || undefined)
    geo.start()
    wakeLock.request()
    // 非同步抓當下天氣並回寫；失敗靜默降級，不擋散步
    currentWeather.value = null
    weather.fetchCurrent().then((w) => {
      if (!w) return
      currentWeather.value = w
      setWeather(w).catch(() => {})
    })
  } catch (e: any) {
    errorMsg.value = e?.message ?? '無法開始散步'
  }
}

async function onPoopSubmit(input: PoopInput) {
  if (!active.value) return
  try {
    const log = await logPoop(input, active.value.id)
    poops.value.push(log)
  } catch (e: any) {
    errorMsg.value = e?.message ?? '記錄失敗'
  }
}

async function onEndConfirm(payload: { note: string; weather: Weather | null }) {
  try {
    const { distanceM, route } = geo.snapshot()
    await endWalk({ distanceM, route, note: payload.note, weather: payload.weather })
    geo.reset()
    currentWeather.value = null
    wakeLock.release()
    endSheetOpen.value = false
    router.push('/')
  } catch (e: any) {
    errorMsg.value = e?.message ?? '無法結束散步'
  }
}
</script>

<template>
  <main class="flex min-h-screen flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
    <!-- 尚未開始 -->
    <template v-if="!isWalking">
      <div class="flex flex-1 flex-col items-center justify-center text-center">
        <Icon name="lucide:dog" class="text-7xl text-walk" />
        <h1 class="mt-5 font-serif text-2xl font-semibold text-ink">準備好出發了嗎？</h1>
        <p class="mt-1.5 text-sm text-muted">按下開始，計時、距離與便便記錄就緒</p>
        <button class="btn mt-8 w-64 bg-walk text-white text-lg" :disabled="loading" @click="onStart">
          <template v-if="loading">準備中…</template>
          <template v-else><Icon name="lucide:footprints" class="text-xl" /> 開始散步</template>
        </button>
      </div>
    </template>

    <!-- 散步中 -->
    <template v-else>
      <div class="flex flex-1 flex-col items-center justify-center">
        <WalkTimer v-if="active" :started-at="active.started_at" />

        <!-- 即時距離 -->
        <div class="mt-4 flex items-center gap-1.5 text-walk">
          <Icon name="lucide:map-pin" class="text-lg" />
          <span class="text-2xl font-bold tabular-nums">{{ formatDistance(geo.distanceM.value) }}</span>
        </div>
        <p v-if="geoHint" class="mt-1 text-xs text-muted">{{ geoHint }}</p>
        <p v-else-if="wakeLock.active.value" class="mt-1 flex items-center gap-1 text-xs text-muted">
          <Icon name="lucide:sun" /> 螢幕保持亮著，持續記錄路線
        </p>

        <!-- 一鍵記錄便便（戶外大按鈕） -->
        <button
          class="btn mt-10 w-72 bg-poop text-white text-xl shadow-lg"
          style="min-height: 64px"
          @click="sheetOpen = true"
        >
          <Icon name="app:poop" class="text-2xl" /> 記錄便便
        </button>
        <p class="mt-3 text-sm text-muted">本次已記錄 {{ poops.length }} 次</p>

        <!-- 本次便便縮影 -->
        <div v-if="poops.length" class="mt-4 flex flex-wrap justify-center gap-2">
          <PoopPill v-for="p in poops" :key="p.id" :consistency="p.consistency" :color="p.color" />
        </div>
      </div>

      <button
        class="btn mb-[max(1.5rem,env(safe-area-inset-bottom))] w-full bg-alert text-white"
        :disabled="loading"
        @click="endSheetOpen = true"
      >
        結束散步
      </button>
    </template>

    <p v-if="errorMsg" class="pb-4 text-center text-sm text-alert">{{ errorMsg }}</p>

    <PoopForm v-model:open="sheetOpen" @submit="onPoopSubmit" />
    <WalkEndSheet
      v-model:open="endSheetOpen"
      :duration-sec="liveDurationSec"
      :distance-m="geo.distanceM.value"
      :poop-count="poops.length"
      :weather="currentWeather"
      :weather-loading="weather.loading.value"
      :saving="loading"
      @confirm="onEndConfirm"
    />
  </main>
</template>
