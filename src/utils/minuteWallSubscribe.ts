/**
 * Scrum schedule helpers use whole-minute resolution (`nowMinutes` in scrumMaster). React state that
 * drives those memos must tick on each real minute boundary or banners / collection windows lag.
 */

/** Milliseconds until the next real-time minute boundary. */
export function msUntilNextMinute(): number {
  const d = new Date()
  return 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds())
}

/**
 * Runs `onTick` immediately when armed, then on every wall-clock minute while `document` is visible.
 * Clears timers while hidden. Re-arms on `visibilitychange` → visible.
 */
export function subscribeVisibleMinuteAligned(onTick: () => void): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let intervalId: ReturnType<typeof setInterval> | undefined

  const clearAll = () => {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
    if (intervalId != null) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  }

  const arm = () => {
    clearAll()
    if (typeof document === 'undefined' || document.visibilityState === 'hidden') return
    onTick()
    timeoutId = window.setTimeout(() => {
      onTick()
      intervalId = window.setInterval(onTick, 60_000)
      timeoutId = undefined
    }, msUntilNextMinute())
  }

  const onVis = () => {
    if (document.visibilityState === 'hidden') {
      clearAll()
      return
    }
    arm()
  }

  arm()
  document.addEventListener('visibilitychange', onVis)
  return () => {
    document.removeEventListener('visibilitychange', onVis)
    clearAll()
  }
}
