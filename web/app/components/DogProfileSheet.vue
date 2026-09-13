<script setup lang="ts">
import type { Dog, DogGender } from '~/types/database'
import type { DogInput } from '~/composables/useDog'
import { GENDER_OPTIONS, ageFromBirthYear, birthYearRange } from '~/utils/dog'

// 設定狗狗基本資料的底部 sheet（與 PoopForm 同風格）。
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  dog: Dog | null
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{ submit: [input: DogInput] }>()

const name = ref('')
const gender = ref<DogGender | null>(null)
const birthYear = ref('')

const yearRange = birthYearRange()
const canSave = computed(() => name.value.trim().length > 0)

// 即時預覽歲數
const agePreview = computed(() => {
  const y = Number.parseInt(birthYear.value, 10)
  return Number.isNaN(y) ? null : ageFromBirthYear(y)
})

// 每次開啟以現有資料預填
watch(open, (v) => {
  if (v) {
    name.value = props.dog?.name ?? ''
    gender.value = props.dog?.gender ?? null
    birthYear.value = props.dog?.birth_year != null ? String(props.dog.birth_year) : ''
  }
})

function save() {
  if (!canSave.value) return
  const parsed = Number.parseInt(birthYear.value, 10)
  const year = Number.isNaN(parsed)
    ? null
    : Math.min(yearRange.max, Math.max(yearRange.min, parsed))
  emit('submit', {
    name: name.value,
    gender: gender.value,
    birthYear: year,
  })
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
            <Icon name="lucide:dog" /> 狗狗資料
          </h2>

          <!-- 名字 -->
          <p class="mt-4 mb-2 text-sm font-medium text-muted">名字</p>
          <input
            v-model="name"
            type="text"
            placeholder="例如：小白"
            maxlength="20"
            class="w-full rounded-xl border border-ink/10 px-3 py-3 text-base focus:border-walk focus:outline-none"
          >

          <!-- 性別 -->
          <p class="mt-4 mb-2 text-sm font-medium text-muted">性別（可選）</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in GENDER_OPTIONS"
              :key="opt.value"
              type="button"
              class="flex items-center justify-center gap-1.5 rounded-2xl border-2 py-3 text-sm transition active:scale-95"
              :class="gender === opt.value
                ? 'border-walk bg-walk-bg text-walk font-semibold'
                : 'border-ink/10 text-ink'"
              @click="gender = gender === opt.value ? null : opt.value"
            >
              <Icon :name="opt.icon" class="text-lg" />
              <span>{{ opt.label }}</span>
            </button>
          </div>

          <!-- 出生年 -->
          <p class="mt-4 mb-2 text-sm font-medium text-muted">出生年（西元，可選）</p>
          <div class="flex items-center gap-2">
            <input
              v-model="birthYear"
              type="number"
              inputmode="numeric"
              :min="yearRange.min"
              :max="yearRange.max"
              placeholder="例如：2021"
              class="w-full rounded-xl border border-ink/10 px-3 py-3 text-base focus:border-walk focus:outline-none"
            >
            <span class="shrink-0 text-sm text-muted">年</span>
          </div>
          <p class="mt-1.5 text-xs text-muted">
            只需填年份，歲數會自動增長<template v-if="agePreview"> · 目前約 {{ agePreview }}</template>
          </p>

          <p v-if="props.error" class="mt-3 rounded-xl bg-alert-bg px-3 py-2 text-sm text-alert">
            {{ props.error }}
          </p>

          <div class="mt-5 flex gap-3">
            <button type="button" class="btn flex-1 bg-ink/5 text-ink" @click="open = false">
              取消
            </button>
            <button
              type="button"
              class="btn flex-1 bg-walk text-white"
              :disabled="!canSave || props.saving"
              @click="save"
            >
              {{ props.saving ? '儲存中…' : '儲存' }}
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
