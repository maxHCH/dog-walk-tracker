<script setup lang="ts">
import type { DogInput } from '~/composables/useDog'
import { formatDuration } from '~/utils/time'
import { ageFromBirthYear, genderLabel } from '~/utils/dog'

// 首頁：今日摘要（計劃書 §4 index.vue）
// 一眼看懂今日狀況，不需滾動。
const { fetchToday } = useToday()
const { isWalking } = useWalk()
const { dog, loaded: dogLoaded, fetchDog, saveDog } = useDog()

const { data: summary, refresh, pending } = await useAsyncData('today', () => fetchToday())
await useAsyncData('dog', () => fetchDog())

// 從散步頁返回時刷新數字
onActivated(() => refresh())

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
  <main class="px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
    <header class="flex items-center justify-between">
      <div class="min-w-0">
        <h1 class="truncate text-2xl font-bold">
          {{ greeting }}<template v-if="dog">，{{ dog.name }}</template> 👋
        </h1>
        <p class="text-sm text-gray-400">
          {{ today }}<template v-if="dogMeta"> · {{ dogMeta }}</template>
        </p>
      </div>
      <button
        class="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm active:scale-95"
        @click="profileOpen = true"
      >
        <span>🐶</span>
        <span class="text-gray-500">{{ dog ? '編輯' : '設定' }}</span>
      </button>
    </header>

    <!-- 尚未建立狗狗資料時的引導 -->
    <button
      v-if="dogLoaded && !dog"
      class="mt-4 w-full rounded-2xl border-2 border-dashed border-walk/40 bg-walk-bg/60 px-4 py-3 text-left text-sm text-walk active:scale-[0.99]"
      @click="profileOpen = true"
    >
      🐶 幫狗狗建立基本資料，首頁就會跟牠打招呼 ›
    </button>

    <!-- 散步中提示 -->
    <NuxtLink
      v-if="isWalking"
      to="/walk"
      class="mt-5 flex items-center justify-between rounded-2xl bg-walk px-4 py-3.5 text-white"
    >
      <span class="flex items-center gap-2 font-semibold">
        <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> 散步進行中…
      </span>
      <span class="text-sm opacity-90">回到計時 ›</span>
    </NuxtLink>

    <!-- 今日數字 -->
    <section class="mt-5 grid grid-cols-2 gap-3">
      <StatsCard tone="walk" emoji="🐕" label="今日散步" :value="summary?.walkCount ?? 0" unit="次" />
      <StatsCard tone="walk" emoji="⏱️" label="總時長" :value="formatDuration(summary?.totalDurationSec ?? 0)" />
      <StatsCard tone="poop" emoji="💩" label="今日便便" :value="summary?.poopCount ?? 0" unit="次" />
      <StatsCard
        :tone="(summary?.abnormalPoopCount ?? 0) > 0 ? 'alert' : 'poop'"
        emoji="⚠️"
        label="異常便便"
        :value="summary?.abnormalPoopCount ?? 0"
        unit="次"
      />
    </section>

    <!-- 今日便便明細 -->
    <section v-if="summary?.poops.length" class="mt-6">
      <h2 class="mb-2 text-sm font-semibold text-gray-500">今日便便記錄</h2>
      <ul class="space-y-2">
        <li
          v-for="p in summary.poops"
          :key="p.id"
          class="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-sm"
        >
          <PoopPill :consistency="p.consistency" :color="p.color" />
          <span class="text-xs text-gray-400">
            {{ new Date(p.logged_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }}
          </span>
        </li>
      </ul>
    </section>

    <p v-else-if="!pending" class="mt-8 text-center text-sm text-gray-400">
      今天還沒有記錄，出發散步吧！
    </p>

    <!-- 開始散步 CTA -->
    <NuxtLink
      v-if="!isWalking"
      to="/walk"
      class="btn mt-8 w-full bg-walk text-white text-lg"
    >
      🐾 開始散步
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
