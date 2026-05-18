import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
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

export function useTimer() {
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion)
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

    if (reduceMotion) {
      const id = window.setInterval(() => {
        useTimerStore.getState().syncWallClock()
        persistRunning()
      }, 1000)
      return () => clearInterval(id)
    }

    let raf = 0
    const loop = () => {
      useTimerStore.getState().syncWallClock()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [isRunning, reduceMotion])

  useEffect(() => {
    if (!isRunning) return
    const id = window.setInterval(() => persistRunning(), 2000)
    return () => clearInterval(id)
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
