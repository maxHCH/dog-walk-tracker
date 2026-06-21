<script setup lang="ts">
import type { DogInput } from '~/composables/useDog'
import { formatDuration } from '~/utils/time'
import { ageFromBirthYear, genderLabel } from '~/utils/dog'

// 首頁：今日摘要（計劃書 §4 index.vue）
// 一眼看懂今日狀況，不需滾動。
const user = useSupabaseUser()
const { fetchToday } = useToday()
const { isWalking } = useWalk()
const { dog, loaded: dogLoaded, fetchDog, saveDog } = useDog()

// watch: [user] — 登入狀態還原後自動重抓，避免首次進首頁時 user 尚未就緒
// 導致 fetchToday 回傳空資料、需切換 tab 才更新的問題。
const { data: summary, refresh, pending } = await useAsyncData(
  'today', () => fetchToday(), { watch: [user] },
)
await useAsyncData('dog', () => fetchDog(), { watch: [user] })

// 從散步頁返回、或 App 由背景回到前景時刷新數字
onActivated(() => refresh())
onMounted(() => {
  document.addEventListener('visibilitychange', onVisible)
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisible)
})
function onVisible() {
  if (document.visibilityState === 'visible') refresh()
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早安'
  if (h < 18) return '午安'
  return '晚安'
})

// 狗狗資料設定彈窗
const profileOpen = ref(false)
const profileSaving = ref(false)
const profileError = ref('')

// 年齡 · 性別（生日/性別有填才顯示）
const dogMeta = computed(() => {
  if (!dog.value) return null
  return [ageFromBirthYear(dog.value.birth_year), genderLabel(dog.value.gender)].filter(Boolean).join(' · ') || null
})

async function onProfileSubmit(input: DogInput) {
  profileError.value = ''
  profileSaving.value = true
  try {
    await saveDog(input)
    profileOpen.value = false
  } catch (e: any) {
    profileError.value = e?.message ?? '儲存失敗，請確認資料表已建立'
  } finally {
    profileSaving.value = false
  }
}

const today = new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
</script>

<template>
  <main class="px-6 pb-12 pt-[max(2.25rem,calc(env(safe-area-inset-top)+1rem))]">
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="eyebrow text-clay">Dog Walk Tracker</p>
        <h1 class="mt-2 font-serif text-[2.1rem] font-semibold leading-[1.12] text-ink">
          {{ greeting }}<template v-if="dog">，{{ dog.name }}</template>
        </h1>
        <p class="mt-2.5 text-sm text-muted">
          {{ today }}<template v-if="dogMeta"> · {{ dogMeta }}</template>
        </p>
      </div>
      <button
        class="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm shadow-card ring-1 ring-ink/5 active:scale-95"
        @click="profileOpen = true"
      >
        <Icon name="lucide:pencil" class="text-muted" />
        <span class="text-muted">{{ dog ? '編輯' : '設定' }}</span>
      </button>
    </header>

    <!-- 尚未建立狗狗資料時的引導 -->
    <button
      v-if="dogLoaded && !dog"
      class="mt-6 flex w-full items-center gap-2 rounded-2xl border border-dashed border-clay/40 bg-clay/[0.06] px-4 py-3.5 text-left text-sm text-clay active:scale-[0.99]"
      @click="profileOpen = true"
    >
      <Icon name="lucide:dog" class="shrink-0 text-base" />
      <span>幫狗狗建立基本資料，首頁就會跟牠打招呼 ›</span>
    </button>

    <!-- 散步中提示 -->
    <NuxtLink
      v-if="isWalking"
      to="/walk"
      class="mt-6 flex items-center justify-between rounded-3xl bg-walk px-5 py-4 text-white shadow-float"
    >
      <span class="flex items-center gap-2.5 font-semibold">
        <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> 散步進行中…
      </span>
      <span class="text-sm opacity-90">回到計時 ›</span>
    </NuxtLink>

    <!-- 今日總覽 -->
    <section class="mt-8">
      <p class="eyebrow mb-3.5 text-muted">今日總覽</p>
      <div class="grid grid-cols-2 gap-3">
        <StatsCard tone="walk" icon="lucide:footprints" label="今日散步" :value="summary?.walkCount ?? 0" unit="次" />
        <StatsCard tone="walk" icon="lucide:timer" label="總時長" :value="formatDuration(summary?.totalDurationSec ?? 0)" />
        <StatsCard tone="poop" icon="app:poop" label="今日便便" :value="summary?.poopCount ?? 0" unit="次" />
        <StatsCard
          :tone="(summary?.abnormalPoopCount ?? 0) > 0 ? 'alert' : 'poop'"
          icon="lucide:triangle-alert"
          label="異常便便"
          :value="summary?.abnormalPoopCount ?? 0"
          unit="次"
        />
      </div>
    </section>

    <!-- 今日便便明細 -->
    <section v-if="summary?.poops.length" class="mt-8">
      <p class="eyebrow mb-3.5 text-muted">今日便便記錄</p>
      <ul class="space-y-2.5">
        <li
          v-for="p in summary.poops"
          :key="p.id"
          class="card flex items-center justify-between px-4 py-3"
        >
          <PoopPill :consistency="p.consistency" :color="p.color" />
          <span class="text-xs text-muted">
            {{ new Date(p.logged_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }}
          </span>
        </li>
      </ul>
    </section>

    <p
      v-if="!pending && !summary?.walkCount && !summary?.poops.length"
      class="mt-10 text-center text-sm text-muted"
    >
      今天還沒有記錄，出發散步吧！
    </p>

    <!-- 開始散步 CTA -->
    <NuxtLink
      v-if="!isWalking"
      to="/walk"
      class="btn mt-9 w-full bg-walk text-white text-lg shadow-float"
    >
      <Icon name="lucide:footprints" class="text-xl" /> 開始散步
    </NuxtLink>

    <DogProfileSheet
      v-model:open="profileOpen"
      :dog="dog"
      :saving="profileSaving"
      :error="profileError"
      @submit="onProfileSubmit"
    />
  </main>
</template>
