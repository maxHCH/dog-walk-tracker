<script setup lang="ts">
import type { Consistency, PoopColor } from '~/types/database'
import type { PoopInput } from '~/composables/usePoop'
import { CONSISTENCY_OPTIONS, COLOR_OPTIONS, isCriticalColor } from '~/utils/poop'

// 便便記錄表單 sheet（計劃書 §5.2）
// 3 步完成：tap 開啟 → 選性狀/顏色 → 儲存。
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ submit: [input: PoopInput] }>()

const consistency = ref<Consistency>('normal')
const color = ref<PoopColor>('brown')
const note = ref('')
const saving = ref(false)

const critical = computed(() => isCriticalColor(color.value))

watch(open, (v) => {
  if (v) {
    // 每次開啟重置為預設
    consistency.value = 'normal'
    color.value = 'brown'
    note.value = ''
  }
})

async function save() {
  saving.value = true
  try {
    emit('submit', { consistency: consistency.value, color: color.value, note: note.value })
    open.value = false
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end" @click.self="open = false">
        <div class="absolute inset-0 bg-black/40" @click="open = false" />
        <div class="relative w-full rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
          <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-ink/15" />
          <h2 class="flex items-center gap-1.5 text-lg font-bold text-poop">
            <Icon name="app:poop" /> 記錄便便
          </h2>

          <!-- 性狀 -->
          <p class="mt-4 mb-2 text-sm font-medium text-muted">性狀</p>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="opt in CONSISTENCY_OPTIONS"
              :key="opt.value"
              type="button"
              class="rounded-2xl border-2 py-3.5 text-sm transition active:scale-95"
              :class="consistency === opt.value
                ? 'border-poop bg-poop-bg text-poop font-semibold'
                : 'border-ink/10 text-ink/70'"
              @click="consistency = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- 顏色 -->
          <p class="mt-4 mb-2 text-sm font-medium text-muted">顏色</p>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="opt in COLOR_OPTIONS"
              :key="opt.value"
              type="button"
              class="flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-sm transition active:scale-95"
              :class="color === opt.value
                ? 'border-poop bg-poop-bg text-poop font-semibold'
                : 'border-ink/10 text-ink/70'"
              @click="color = opt.value"
            >
              <span class="h-5 w-5 rounded-full ring-1 ring-black/10" :style="{ backgroundColor: opt.swatch }" />
              <span>{{ opt.label }}</span>
            </button>
          </div>

          <!-- 帶血/黑色就醫警示（計劃書 §5.4） -->
          <p v-if="critical" class="mt-3 flex items-center gap-1.5 rounded-xl bg-alert-bg px-3 py-2 text-sm text-alert">
            <Icon name="lucide:triangle-alert" class="shrink-0" /> 黑色或帶血便建議盡快就醫檢查。
          </p>

          <!-- 備註 -->
          <input
            v-model="note"
            type="text"
            placeholder="備註（可選）"
            class="mt-4 w-full rounded-xl border border-ink/10 px-3 py-3 text-base focus:border-poop focus:outline-none"
          >

          <div class="mt-5 flex gap-3">
            <button type="button" class="btn flex-1 bg-ink/5 text-ink" @click="open = false">
              取消
            </button>
            <button type="button" class="btn flex-1 bg-poop text-white" :disabled="saving" @click="save">
              {{ saving ? '儲存中…' : '儲存' }}
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
