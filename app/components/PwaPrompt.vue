<script setup lang="ts">
// PWA 安裝 / 更新提示。
// - 可安裝（Android/桌面）時跳出「加入主畫面」。
// - 有新版本時跳出「重新整理更新」。
// iOS Safari 無 beforeinstallprompt，使用者需手動「加入主畫面」，故不顯示安裝鈕。
const { $pwa } = useNuxtApp()

const showInstall = computed(() => !!$pwa?.showInstallPrompt && !$pwa?.needRefresh)
const showUpdate = computed(() => !!$pwa?.needRefresh)
const visible = computed(() => showInstall.value || showUpdate.value)
</script>

<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="fixed inset-x-3 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5rem))] z-50 mx-auto max-w-md rounded-2xl bg-white px-4 py-3 shadow-2xl ring-1 ring-black/5"
    >
      <div class="flex items-center gap-3">
        <span class="text-2xl">🐾</span>
        <div class="min-w-0 flex-1">
          <template v-if="showUpdate">
            <p class="text-sm font-semibold">有新版本</p>
            <p class="text-xs text-gray-400">重新整理以更新</p>
          </template>
          <template v-else>
            <p class="text-sm font-semibold">安裝散步記錄</p>
            <p class="text-xs text-gray-400">加到主畫面，像 App 一樣開啟</p>
          </template>
        </div>
        <template v-if="showUpdate">
          <button class="rounded-xl bg-walk px-3 py-2 text-xs font-semibold text-white" @click="$pwa?.updateServiceWorker()">
            更新
          </button>
        </template>
        <template v-else>
          <button class="rounded-xl px-2 py-2 text-xs text-gray-400" @click="$pwa?.cancelInstall()">
            略過
          </button>
          <button class="rounded-xl bg-walk px-3 py-2 text-xs font-semibold text-white" @click="$pwa?.install()">
            安裝
          </button>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(0.75rem); }
</style>
