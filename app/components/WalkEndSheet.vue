<script setup lang="ts">
import { formatDuration } from '~/utils/time'
import { formatDistance } from '~/utils/geo'

// 結束散步前的確認 sheet：顯示本次摘要 + 可選備註。
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  durationSec: number
  distanceM: number | null
  poopCount: number
  saving?: boolean
}>()

const emit = defineEmits<{ confirm: [note: string] }>()

const note = ref('')

watch(open, (v) => {
  if (v) note.value = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end" @click.self="open = false">
        <div class="absolute inset-0 bg-black/40" @click="open = false" />
        <div class="relative w-full rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
          <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />
          <h2 class="text-lg font-bold text-walk">結束這次散步 🐾</h2>

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

          <input
            v-model="note"
            type="text"
            placeholder="這次散步的備註（可選）"
            class="mt-4 w-full rounded-xl border border-gray-200 px-3 py-3 text-base focus:border-walk focus:outline-none"
          >

          <div class="mt-5 flex gap-3">
            <button type="button" class="btn flex-1 bg-gray-100 text-gray-600" @click="open = false">
              繼續散步
            </button>
            <button
              type="button"
              class="btn flex-1 bg-alert text-white"
              :disabled="props.saving"
              @click="emit('confirm', note)"
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
