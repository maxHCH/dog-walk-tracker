// 螢幕喚醒鎖：散步中讓螢幕不自動熄滅，避免頁面被系統凍結導致 GPS 中斷。
// 背景/切頁時系統會自動釋放鎖；回到前景需重新請求（visibilitychange 處理）。
// 不支援（如舊版 iOS）時靜默略過，不影響其他功能。

export function useWakeLock() {
  const active = ref(false)
  let sentinel: WakeLockSentinel | null = null
  let want = false

  async function acquire() {
    if (!want || sentinel) return
    if (!import.meta.client || !('wakeLock' in navigator)) return
    try {
      sentinel = await navigator.wakeLock.request('screen')
      active.value = true
      sentinel.addEventListener('release', () => {
        active.value = false
        sentinel = null
      })
    } catch {
      active.value = false // 多半是非使用者手勢或不支援，略過
    }
  }

  /** 開始保持螢幕亮 */
  async function request() {
    want = true
    await acquire()
  }

  /** 放開，讓螢幕恢復正常熄滅 */
  async function release() {
    want = false
    if (sentinel) {
      try { await sentinel.release() } catch { /* ignore */ }
      sentinel = null
    }
    active.value = false
  }

  // 回到前景時重新請求（系統會在背景時釋放鎖）
  function onVisible() {
    if (document.visibilityState === 'visible') acquire()
  }

  onMounted(() => document.addEventListener('visibilitychange', onVisible))
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisible)
    release()
  })

  return { active, request, release }
}
