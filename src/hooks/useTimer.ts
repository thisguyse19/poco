import { useEffect } from 'react'
import { storage } from '../services/storage'
import { getWallRemaining, phaseDuration, useTimerStore } from '../stores/timerStore'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function formatMs(ms: number) {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${pad2(m)}:${pad2(s)}`
}

/** MM:SS display changes each second; 2s wall sync is enough for UX while cutting wakeups vs 1s. */
const WALL_TICK_MS = 2000
/** Persist less often while running — phase end is still exact via `phaseEndsAt`. */
const PERSIST_TICK_MS = 5000

export function useTimer() {
  const mode = useTimerStore((s) => s.mode)
  const isRunning = useTimerStore((s) => s.isRunning)
  const phaseEndsAt = useTimerStore((s) => s.phaseEndsAt)
  const remainingMs = useTimerStore((s) => s.remainingMs)
  const pausedRemaining = useTimerStore((s) => s.pausedRemaining)
  const sessionsCompleted = useTimerStore((s) => s.sessionsCompleted)
  const currentTaskId = useTimerStore((s) => s.currentTaskId)
  const focusSessionsInCycle = useTimerStore((s) => s.focusSessionsInCycle)

  useEffect(() => {
    queueMicrotask(() => useTimerStore.getState().syncWallClock())
  }, [])

  useEffect(() => {
    if (!isRunning) return

    let tickId: ReturnType<typeof setInterval> | undefined
    let persistId: ReturnType<typeof setInterval> | undefined

    const stop = () => {
      if (tickId != null) {
        clearInterval(tickId)
        tickId = undefined
      }
      if (persistId != null) {
        clearInterval(persistId)
        persistId = undefined
      }
    }

    const start = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
      useTimerStore.getState().syncWallClock()
      tickId = window.setInterval(() => useTimerStore.getState().syncWallClock(), WALL_TICK_MS)
      persistId = window.setInterval(() => persistRunning(), PERSIST_TICK_MS)
    }

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        stop()
        return
      }
      stop()
      start()
    }

    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [isRunning])

  const wall = getWallRemaining({
    mode,
    isRunning,
    phaseEndsAt,
    remainingMs,
    pausedRemaining,
    currentTaskId,
    focusSessionsInCycle,
    sessionsCompleted,
  })
  const total = phaseDuration(mode)
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - wall / total)) : 0
  const formatted = formatMs(wall)

  return {
    mode,
    isRunning,
    progress,
    formatted,
    sessionsCompleted,
    currentTaskId,
    focusSessionsInCycle,
    start: () => useTimerStore.getState().start(),
    pause: () => useTimerStore.getState().pause(),
    reset: () => useTimerStore.getState().reset(),
    skipToNextPhase: () => useTimerStore.getState().skipToNextPhase(),
    setCurrentTask: (id: string | null) => useTimerStore.getState().setCurrentTask(id),
  }
}

function persistRunning() {
  const s = useTimerStore.getState()
  if (!s.isRunning) return
  const rem = getWallRemaining(s)
  storage.saveTimer({
    mode: s.mode,
    isRunning: s.isRunning,
    phaseEndsAt: s.phaseEndsAt,
    remainingMs: rem,
    currentTaskId: s.currentTaskId,
    focusSessionsInCycle: s.focusSessionsInCycle,
    sessionsCompleted: s.sessionsCompleted,
    runStartedAt: s.runStartedAt ?? null,
  })
}
