<script setup lang="ts">
import type { HealthReport } from '~/composables/useAiReport'

// AI 健康分析（Phase 3）：讀最新快取，按鈕觸發產生。
const { fetchLatest, generate } = useAiReport()
const user = useSupabaseUser()

const { data: latest, refresh } = await useAsyncData('ai-report', () => fetchLatest(), { watch: [user] })

const generating = ref(false)
const errorMsg = ref('')
const insufficient = ref(false)

// 目前顯示用的報告（讀快取的 detail_json，或剛產生的）
const report = computed<HealthReport | null>(() => (latest.value?.detail_json as unknown as HealthReport) ?? null)
const generatedAt = computed(() => latest.value?.generated_at ?? null)

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

async function onGenerate() {
  errorMsg.value = ''
  insufficient.value = false
  generating.value = true
  try {
    const res = await generate()
    if (res.status === 'insufficient') {
      insufficient.value = true
    } else {
      await refresh()
    }
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage ?? e?.statusMessage ?? '產生失敗，請稍後再試'
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <main class="px-6 pb-10 pt-[max(2.25rem,calc(env(safe-area-inset-top)+1rem))]">
    <header class="flex items-start justify-between gap-3">
      <div>
        <p class="eyebrow text-clay">AI Insights</p>
        <h1 class="mt-2 font-serif text-3xl font-semibold text-ink">AI 健康分析</h1>
        <p v-if="generatedAt" class="mt-2 text-sm text-muted">更新於 {{ fmtTime(generatedAt) }}</p>
      </div>
      <button
        v-if="report"
        class="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm text-muted shadow-card ring-1 ring-ink/5 active:scale-95 disabled:opacity-50"
        :disabled="generating"
        @click="onGenerate"
      >
        <Icon name="lucide:refresh-cw" :class="generating ? 'animate-spin' : ''" />
        {{ generating ? '分析中' : '重新產生' }}
      </button>
    </header>

    <!-- 資料不足 -->
    <div v-if="insufficient" class="card mt-6 p-5 text-center">
      <Icon name="lucide:calendar-clock" class="text-4xl text-muted opacity-60" />
      <p class="mt-3 text-sm text-muted">資料還太少，無法做出可靠分析<br>多記幾天散步與便便再回來吧</p>
    </div>

    <!-- 尚無報告 -->
    <div v-else-if="!report" class="mt-6">
      <div class="card p-6 text-center">
        <Icon name="lucide:sparkles" class="text-4xl text-ai opacity-70" />
        <h2 class="mt-3 font-serif text-xl font-semibold text-ink">產生本週健康觀察</h2>
        <p class="mt-2 text-sm text-muted">
          讓 Claude 分析近 7 天的散步量與便便趨勢，<br>給你一份白話的健康摘要與建議。
        </p>
        <button
          class="btn mt-5 w-full bg-ai text-white shadow-float disabled:opacity-60"
          :disabled="generating"
          @click="onGenerate"
        >
          <Icon name="lucide:sparkles" :class="generating ? 'animate-pulse' : ''" />
          {{ generating ? 'Claude 分析中…' : '產生本週分析' }}
        </button>
      </div>
    </div>

    <!-- 報告內容 -->
    <div v-else class="mt-6 space-y-3.5">
      <!-- 就醫/異常警示 -->
      <div
        v-if="report.vet_recommended"
        class="flex items-start gap-2.5 rounded-2xl bg-alert-bg px-4 py-3.5 text-alert"
      >
        <Icon name="lucide:triangle-alert" class="mt-0.5 shrink-0" />
        <p class="text-sm font-medium">偵測到需要注意的警訊，建議盡快帶狗狗就醫檢查。</p>
      </div>

      <!-- 摘要 -->
      <section class="card p-5">
        <p class="eyebrow mb-2.5 text-clay">健康摘要</p>
        <p class="text-[15px] leading-relaxed text-ink">{{ report.summary }}</p>
      </section>

      <!-- 便便 / 活動 -->
      <section class="card p-5">
        <p class="eyebrow mb-2.5 text-muted">便便趨勢</p>
        <p class="text-sm leading-relaxed text-ink/90">{{ report.poop_assessment }}</p>
      </section>
      <section class="card p-5">
        <p class="eyebrow mb-2.5 text-muted">散步活動量</p>
        <p class="text-sm leading-relaxed text-ink/90">{{ report.activity_assessment }}</p>
      </section>
      <section v-if="report.weather_assessment" class="card p-5">
        <p class="eyebrow mb-2.5 flex items-center gap-1.5 text-muted">
          <Icon name="lucide:cloud-sun" /> 天氣與健康
        </p>
        <p class="text-sm leading-relaxed text-ink/90">{{ report.weather_assessment }}</p>
      </section>

      <!-- 建議 -->
      <section v-if="report.suggestions?.length" class="card p-5">
        <p class="eyebrow mb-3 text-muted">照護建議</p>
        <ul class="space-y-2.5">
          <li v-for="(s, i) in report.suggestions" :key="i" class="flex items-start gap-2.5 text-sm text-ink/90">
            <Icon name="lucide:check" class="mt-0.5 shrink-0 text-walk" />
            <span class="leading-relaxed">{{ s }}</span>
          </li>
        </ul>
      </section>

      <p class="px-1 pt-1 text-center text-xs text-muted">
        此為 AI 觀察，非獸醫診斷，有疑慮請諮詢專業獸醫。
      </p>
    </div>

    <p v-if="errorMsg" class="mt-4 rounded-xl bg-alert-bg px-4 py-3 text-center text-sm text-alert">
      {{ errorMsg }}
    </p>
  </main>
</template>
