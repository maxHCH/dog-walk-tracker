<script setup lang="ts">
import type { PoopInput } from '~/composables/usePoop'
import type { PoopLog } from '~/types/database'

// 散步進行中畫面（計劃書 §4 walk.vue）
const { active, isWalking, loading, startWalk, endWalk } = useWalk()
const { logPoop, poopsForSession } = usePoop()
const router = useRouter()

const sheetOpen = ref(false)
const poops = ref<PoopLog[]>([])
const errorMsg = ref('')

// 進入頁面：若已有進行中的散步，載入其便便記錄
watch(active, async (s) => {
  poops.value = s ? await poopsForSession(s.id) : []
}, { immediate: true })

async function onStart() {
  errorMsg.value = ''
  try {
    await startWalk()
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

async function onEnd() {
  try {
    await endWalk()
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
        <div class="text-7xl">🐕‍🦺</div>
        <h1 class="mt-4 text-xl font-bold">準備好出發了嗎？</h1>
        <p class="mt-1 text-sm text-gray-400">按下開始，計時與便便記錄就緒</p>
        <button class="btn mt-8 w-64 bg-walk text-white text-lg" :disabled="loading" @click="onStart">
          {{ loading ? '準備中…' : '🐾 開始散步' }}
        </button>
      </div>
    </template>

    <!-- 散步中 -->
    <template v-else>
      <div class="flex flex-1 flex-col items-center justify-center">
        <WalkTimer v-if="active" :started-at="active.started_at" />

        <!-- 一鍵記錄便便（戶外大按鈕） -->
        <button
          class="btn mt-12 w-72 bg-poop text-white text-xl shadow-lg"
          style="min-height: 64px"
          @click="sheetOpen = true"
        >
          💩 記錄便便
        </button>
        <p class="mt-3 text-sm text-gray-400">本次已記錄 {{ poops.length }} 次</p>

        <!-- 本次便便縮影 -->
        <div v-if="poops.length" class="mt-4 flex flex-wrap justify-center gap-2">
          <PoopPill v-for="p in poops" :key="p.id" :consistency="p.consistency" :color="p.color" />
        </div>
      </div>

      <button class="btn mb-[max(1.5rem,env(safe-area-inset-bottom))] w-full bg-alert text-white" :disabled="loading" @click="onEnd">
        {{ loading ? '結束中…' : '結束散步' }}
      </button>
    </template>

    <p v-if="errorMsg" class="pb-4 text-center text-sm text-alert">{{ errorMsg }}</p>

    <PoopForm v-model:open="sheetOpen" @submit="onPoopSubmit" />
  </main>
</template>
