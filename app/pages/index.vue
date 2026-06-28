<script setup lang="ts">
import type { DogInput } from '~/composables/useDog'
import { formatDuration } from '~/utils/time'
import { ageFromBirthYear, genderLabel } from '~/utils/dog'

// 首頁：今日摘要（計劃書 §4 index.vue）
// 一眼看懂今日狀況，不需滾動。
const user = useSupabaseUser()
const { fetchToday } = useToday()
const { active, isWalking, endWalk } = useWalk()
const { deletePoop } = usePoop()
const { dog, loaded: dogLoaded, fetchDog, saveDog } = useDog()

// watch: [user] — 登入狀態還原後自動重抓，避免首次進首頁時 user 尚未就緒
// 導致 fetchToday 回傳空資料、需切換 tab 才更新的問題。
const { data: summary, refresh, pending } = await useAsyncData(
  'today', () => fetchToday(), { watch: [user] },
)
await useAsyncData('dog', () => fetchDog(), { watch: [user] })

// 從散步頁返回、或 App 由背景回到前景時刷新數字
const nowTs = ref(Date.now())
onActivated(() => { refresh(); nowTs.value = Date.now() })
onMounted(() => {
  nowTs.value = Date.now()
  document.addEventListener('visibilitychange', onVisible)
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisible)
})
function onVisible() {
  if (document.visibilityState === 'visible') {
    refresh()
    nowTs.value = Date.now()
  }
}

// 進行中散步：從首頁直接結束（B）＋ 忘記結束偵測（C）
const STALE_HOURS = 2
const confirmEndBanner = ref(false)
const endingWalk = ref(false)
const walkHours = computed(() =>
  active.value ? (nowTs.value - new Date(active.value.started_at).getTime()) / 3600000 : 0,
)
const isStaleWalk = computed(() => isWalking.value && walkHours.value >= STALE_HOURS)

async function endActiveWalk(endedAt?: string) {
  endingWalk.value = true
  try {
    await endWalk(endedAt ? { endedAt } : {})
    confirmEndBanner.value = false
    await refresh()
  } finally {
    endingWalk.value = false
  }
}
// C：用「開始時間 + 指定分鐘」當結束時間，回填較接近的時長
function endWithDuration(minutes: number) {
  if (!active.value) return
  const start = new Date(active.value.started_at).getTime()
  endActiveWalk(new Date(start + minutes * 60000).toISOString())
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

// 今日便便：單筆刪除（多記了可移除）
const confirmingPoopId = ref<string | null>(null)
const deletingPoopId = ref<string | null>(null)
async function onDeletePoop(id: string) {
  deletingPoopId.value = id
  try {
    await deletePoop(id)
    await refresh()
  } finally {
    deletingPoopId.value = null
    confirmingPoopId.value = null
  }
}

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

    <!-- 散步中提示（可一鍵結束，B） -->
    <div
      v-if="isWalking && !isStaleWalk"
      class="mt-6 rounded-3xl bg-walk px-5 py-4 text-white shadow-float"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="flex items-center gap-2.5 font-semibold">
          <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> 散步進行中…
        </span>
        <div class="flex items-center gap-2">
          <NuxtLink to="/walk" class="rounded-full bg-white/15 px-3 py-1.5 text-sm active:scale-95">回到計時</NuxtLink>
          <button class="rounded-full bg-white/15 px-3 py-1.5 text-sm active:scale-95" @click="confirmEndBanner = true">
            結束
          </button>
        </div>
      </div>
      <!-- 結束確認 -->
      <div v-if="confirmEndBanner" class="mt-3 flex items-center gap-2 border-t border-white/20 pt-3">
        <span class="flex-1 text-xs text-white/85">結束這次散步？（從首頁結束不會記錄路線）</span>
        <button class="rounded-lg bg-white/15 px-3 py-1.5 text-xs active:scale-95" @click="confirmEndBanner = false">
          取消
        </button>
        <button
          class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-walk disabled:opacity-60"
          :disabled="endingWalk"
          @click="endActiveWalk()"
        >
          {{ endingWalk ? '結束中…' : '結束' }}
        </button>
      </div>
    </div>

    <!-- 忘記結束偵測（C）：散步超過 2 小時 -->
    <section v-if="isStaleWalk" class="card mt-6 p-4 ring-1 ring-alert/30">
      <p class="flex items-center gap-1.5 text-sm font-semibold text-alert">
        <Icon name="lucide:triangle-alert" class="shrink-0" /> 還在散步中（已 {{ Math.floor(walkHours) }} 小時）
      </p>
      <p class="mt-1 text-xs text-muted">忘記結束了嗎？選一個比較接近的散步時長，幫你補上結束時間：</p>
      <div class="mt-3 grid grid-cols-4 gap-2">
        <button
          v-for="opt in [{ m: 30, l: '30 分' }, { m: 60, l: '1 小時' }, { m: 90, l: '90 分' }]"
          :key="opt.m"
          class="rounded-xl border border-ink/10 py-2.5 text-sm text-ink/80 active:scale-95 disabled:opacity-60"
          :disabled="endingWalk"
          @click="endWithDuration(opt.m)"
        >
          {{ opt.l }}
        </button>
        <button
          class="rounded-xl bg-alert py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          :disabled="endingWalk"
          @click="endActiveWalk()"
        >
          用現在
        </button>
      </div>
    </section>

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
          class="card px-4 py-3"
        >
          <div class="flex items-center justify-between">
            <PoopPill :consistency="p.consistency" :color="p.color" />
            <div class="flex items-center gap-2.5">
              <span class="text-xs text-muted">
                {{ new Date(p.logged_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }}
              </span>
              <button
                class="-m-1 p-1 text-muted/50 active:scale-90"
                aria-label="刪除便便記錄"
                @click="confirmingPoopId = confirmingPoopId === p.id ? null : p.id"
              >
                <Icon name="lucide:trash-2" class="text-base" />
              </button>
            </div>
          </div>

          <!-- 刪除確認 -->
          <div v-if="confirmingPoopId === p.id" class="mt-2.5 flex items-center gap-2 border-t border-ink/5 pt-2.5">
            <span class="flex-1 text-xs text-muted">刪除這筆便便記錄？</span>
            <button class="rounded-lg bg-ink/5 px-3 py-1.5 text-xs text-ink" @click="confirmingPoopId = null">
              取消
            </button>
            <button
              class="rounded-lg bg-alert px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              :disabled="deletingPoopId === p.id"
              @click="onDeletePoop(p.id)"
            >
              {{ deletingPoopId === p.id ? '刪除中…' : '刪除' }}
            </button>
          </div>
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
