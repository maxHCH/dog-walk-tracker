<script setup lang="ts">
import { formatDuration } from '~/utils/time'
import { formatDistance } from '~/utils/geo'
import type { RoutePoint } from '~/utils/geo'

// 歷史記錄：頂部近 7 天趨勢/分布，下方依日期分組的散步＋便便列表。
const { fetchHistory, deleteWalk } = useHistory()
const { fetchStats } = useStats()

const { data: stats, refresh: refreshStats } = await useAsyncData('stats7', () => fetchStats(7))
const { data: groups, refresh: refreshHistory, pending } = await useAsyncData('history', () => fetchHistory(30))

onActivated(() => { refreshStats(); refreshHistory() })

const confirmingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

async function onDelete(id: string) {
  deletingId.value = id
  try {
    await deleteWalk(id)
    await Promise.all([refreshHistory(), refreshStats()])
  } finally {
    deletingId.value = null
    confirmingId.value = null
  }
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

const hasAny = computed(() => (groups.value?.length ?? 0) > 0)
</script>

<template>
  <main class="px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
    <h1 class="text-2xl font-bold">歷史記錄</h1>

    <!-- 近 7 天統計 -->
    <section v-if="stats" class="mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <div class="flex items-baseline justify-between">
        <h2 class="text-sm font-semibold text-gray-500">近 7 天趨勢</h2>
        <span class="text-xs text-gray-400">總時長 {{ formatDuration(stats.totalDurationSec) }}</span>
      </div>
      <WeekTrendChart class="mt-3" :days="stats.days" />

      <div class="mt-4 grid grid-cols-3 gap-2 text-center">
        <div class="rounded-xl bg-walk-bg py-2">
          <div class="text-lg font-bold tabular-nums text-walk">{{ stats.totalWalks }}</div>
          <div class="text-[11px] text-walk/70">散步次數</div>
        </div>
        <div class="rounded-xl bg-poop-bg py-2">
          <div class="text-lg font-bold tabular-nums text-poop">{{ stats.totalPoops }}</div>
          <div class="text-[11px] text-poop/70">便便次數</div>
        </div>
        <div class="rounded-xl py-2" :class="stats.abnormalPoops ? 'bg-alert-bg' : 'bg-gray-100'">
          <div class="text-lg font-bold tabular-nums" :class="stats.abnormalPoops ? 'text-alert' : 'text-gray-400'">
            {{ stats.abnormalPoops }}
          </div>
          <div class="text-[11px]" :class="stats.abnormalPoops ? 'text-alert/70' : 'text-gray-400'">異常便便</div>
        </div>
      </div>
    </section>

    <!-- 便便分布 -->
    <section v-if="stats && stats.totalPoops" class="mt-3 grid gap-3 sm:grid-cols-2">
      <div class="rounded-2xl bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-gray-500">性狀分布</h2>
        <DistChart :items="stats.consistency" />
      </div>
      <div class="rounded-2xl bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-gray-500">顏色分布</h2>
        <DistChart :items="stats.color" />
      </div>
    </section>

    <!-- 分組列表 -->
    <section class="mt-6 space-y-6 pb-4">
      <div v-for="g in groups" :key="g.date">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-600">{{ g.label }}</h2>
          <span class="text-xs text-gray-400">
            🐕 {{ g.walkCount }}　💩 {{ g.poopCount }}
            <span v-if="g.abnormalCount" class="text-alert">⚠️ {{ g.abnormalCount }}</span>
          </span>
        </div>

        <ul class="space-y-2.5">
          <!-- 散步卡 -->
          <li
            v-for="w in g.walks"
            :key="w.id"
            class="rounded-2xl bg-white p-3.5 shadow-sm"
          >
            <div class="flex gap-3">
              <RouteThumb
                v-if="w.route_json"
                :route="(w.route_json as RoutePoint[])"
                :width="84"
                :height="64"
                class="shrink-0"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-walk">
                    🐾 {{ timeLabel(w.started_at) }}<span v-if="w.ended_at"> – {{ timeLabel(w.ended_at) }}</span>
                  </span>
                  <button
                    class="-m-1 p-1 text-gray-300 active:scale-90"
                    aria-label="刪除散步"
                    @click="confirmingId = confirmingId === w.id ? null : w.id"
                  >
                    🗑️
                  </button>
                </div>
                <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                  <span>⏱️ {{ formatDuration(w.duration_sec ?? 0) }}</span>
                  <span v-if="w.distance_m">📍 {{ formatDistance(w.distance_m) }}</span>
                  <span v-if="w.poops.length">💩 {{ w.poops.length }} 次</span>
                </div>
                <div v-if="w.poops.length" class="mt-2 flex flex-wrap gap-1.5">
                  <PoopPill v-for="p in w.poops" :key="p.id" :consistency="p.consistency" :color="p.color" />
                </div>
                <p v-if="w.note" class="mt-2 text-xs text-gray-500">📝 {{ w.note }}</p>
              </div>
            </div>

            <!-- 刪除確認 -->
            <div v-if="confirmingId === w.id" class="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
              <span class="flex-1 text-xs text-gray-500">刪除這次散步與其便便記錄？</span>
              <button class="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600" @click="confirmingId = null">
                取消
              </button>
              <button
                class="rounded-lg bg-alert px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                :disabled="deletingId === w.id"
                @click="onDelete(w.id)"
              >
                {{ deletingId === w.id ? '刪除中…' : '刪除' }}
              </button>
            </div>
          </li>

          <!-- 無散步綁定的便便 -->
          <li
            v-for="p in g.strayPoops"
            :key="p.id"
            class="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5 shadow-sm"
          >
            <PoopPill :consistency="p.consistency" :color="p.color" />
            <span class="text-xs text-gray-400">{{ timeLabel(p.logged_at) }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 空狀態 -->
    <div v-if="!pending && !hasAny" class="mt-16 text-center text-gray-400">
      <div class="text-5xl">📅</div>
      <p class="mt-3 text-sm">還沒有歷史記錄<br>完成第一次散步後就會出現在這裡</p>
    </div>
  </main>
</template>
