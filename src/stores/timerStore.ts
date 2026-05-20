import { create } from 'zustand'
import type { FocusSession, TimerMode, TimerState } from '../types'
import { storage } from '../services/storage'
import { useSettingsStore } from './settingsStore'
import { useTaskStore } from './taskStore'

const DEFAULT_TIMER: TimerState = {
  mode: 'focus',
  isRunning: false,
  phaseEndsAt: null,
  remainingMs: 25 * 60_000,
  currentTaskId: null,
  focusSessionsInCycle: 0,
  sessionsCompleted: 0,
  runStartedAt: null,
}

function loadTimer(): TimerState {
  const p = storage.getTimer()
  if (!p) return { ...DEFAULT_TIMER }
  const merged = { ...DEFAULT_TIMER, ...p }
  delete merged.pausedRemaining
  return merged
}

function focusMs() {
  return useSettingsStore.getState().settings.focusDurationMinutes * 60_000
}

function shortMs() {
  return useSettingsStore.getState().settings.shortBreakMinutes * 60_000
}

function longMs() {
  return useSettingsStore.getState().settings.longBreakMinutes * 60_000
}

export function phaseDuration(mode: TimerMode): number {
  if (mode === 'focus') return focusMs()
  if (mode === 'shortBreak') return shortMs()
  return longMs()
}

export function getWallRemaining(state: TimerState): number {
  if (state.isRunning && state.phaseEndsAt != null) {
    return Math.max(0, state.phaseEndsAt - Date.now())
  }
  if (state.pausedRemaining != null && !state.isRunning) {
    return Math.max(0, state.pausedRemaining)
  }
  return Math.max(0, state.remainingMs)
}

function persistSlice(state: TimerState) {
  storage.saveTimer({
    mode: state.mode,
    isRunning: state.isRunning,
    phaseEndsAt: state.phaseEndsAt,
    remainingMs: state.remainingMs,
    currentTaskId: state.currentTaskId,
    focusSessionsInCycle: state.focusSessionsInCycle,
    sessionsCompleted: state.sessionsCompleted,
    runStartedAt: state.runStartedAt ?? null,
  })
}

type TimerStore = TimerState & {
  syncWallClock: () => void
  start: () => void
  pause: () => void
  reset: () => void
  skipToNextPhase: () => void
  setCurrentTask: (id: string | null) => void
  refreshDurationForMode: () => void
}

export const useTimerStore = create<TimerStore>((set, get) => {
  const appendSession = (session: FocusSession) => {
    const sessions = [...storage.getSessions(), session]
    storage.saveSessions(sessions)
  }

  const completeCurrentPhase = () => {
    const s = get()
    const { autoStartBreaks, autoStartNext, focusDurationMinutes } =
      useSettingsStore.getState().settings

    if (s.mode === 'focus') {
      const planned = focusDurationMinutes
      const durMs = phaseDuration('focus')
      const endedAt = new Date().toISOString()
      const startedMs = s.runStartedAt ?? Date.now() - durMs
      const startedAt = new Date(startedMs).toISOString()
      appendSession({
        id: crypto.randomUUID(),
        taskId: s.currentTaskId,
        startedAt,
        endedAt,
        plannedMinutes: planned,
        completed: true,
      })

      if (s.currentTaskId) {
        const task = useTaskStore.getState().tasks.find((t) => t.id === s.currentTaskId)
        if (task) {
          useTaskStore.getState().updateTask(s.currentTaskId, {
            actualPomodoros: task.actualPomodoros + 1,
          })
        }
      }

      const sessionsCompleted = s.sessionsCompleted + 1
      const nextCycle = s.focusSessionsInCycle + 1
      const needsLong = nextCycle >= 4
      const focusSessionsInCycle = needsLong ? 0 : nextCycle
      const nextMode: TimerMode = needsLong ? 'longBreak' : 'shortBreak'
      const dur = phaseDuration(nextMode)
      const run = autoStartBreaks
      set({
        mode: nextMode,
        isRunning: run,
        phaseEndsAt: run ? Date.now() + dur : null,
        remainingMs: dur,
        sessionsCompleted,
        focusSessionsInCycle,
        pausedRemaining: undefined,
        runStartedAt: run ? Date.now() : null,
      })
      persistSlice(get())
      return
    }

    if (s.mode === 'shortBreak') {
      const dur = phaseDuration('focus')
      const run = autoStartNext
      set({
        mode: 'focus',
        isRunning: run,
        phaseEndsAt: run ? Date.now() + dur : null,
        remainingMs: dur,
        pausedRemaining: undefined,
        runStartedAt: run ? Date.now() : null,
      })
      persistSlice(get())
      return
    }

    const dur = phaseDuration('focus')
    const run = autoStartNext
    set({
      mode: 'focus',
      isRunning: run,
      phaseEndsAt: run ? Date.now() + dur : null,
      remainingMs: dur,
      pausedRemaining: undefined,
      runStartedAt: run ? Date.now() : null,
    })
    persistSlice(get())
  }

  return {
    ...loadTimer(),

    refreshDurationForMode() {
      const s = get()
      if (s.isRunning) return
      const dur = phaseDuration(s.mode)
      set({ remainingMs: dur })
      persistSlice(get())
    },

    syncWallClock() {
      const s = get()
      if (!s.isRunning || s.phaseEndsAt == null) return
      const left = Math.max(0, s.phaseEndsAt - Date.now())
      if (left > 0) {
        set({ remainingMs: left })
        /** Avoid persisting every tick (was paired with ~60fps rAF) — `useTimer` persists on an interval. */
        return
      }
      completeCurrentPhase()
    },

    start() {
      const s = get()
      let rem = getWallRemaining(s)
      if (rem <= 0) rem = phaseDuration(s.mode)
      const phaseEndsAt = Date.now() + rem
      set({
        isRunning: true,
        phaseEndsAt,
        remainingMs: rem,
        pausedRemaining: undefined,
        runStartedAt: Date.now(),
      })
      persistSlice(get())
    },

    pause() {
      const s = get()
      const rem = getWallRemaining(s)
      set({
        isRunning: false,
        phaseEndsAt: null,
        remainingMs: rem,
        pausedRemaining: rem,
        runStartedAt: null,
      })
      persistSlice(get())
    },

    reset() {
      const dur = phaseDuration('focus')
      set({
        mode: 'focus',
        isRunning: false,
        phaseEndsAt: null,
        remainingMs: dur,
        pausedRemaining: undefined,
        runStartedAt: null,
      })
      persistSlice(get())
    },

    skipToNextPhase() {
      const s = get()
      let nextMode: TimerMode
      if (s.mode === 'focus') {
        nextMode = s.focusSessionsInCycle >= 3 ? 'longBreak' : 'shortBreak'
      } else if (s.mode === 'shortBreak') {
        nextMode = 'focus'
      } else {
        nextMode = 'focus'
      }
      const dur = phaseDuration(nextMode)
      set({
        mode: nextMode,
        isRunning: false,
        phaseEndsAt: null,
        remainingMs: dur,
        pausedRemaining: undefined,
        runStartedAt: null,
      })
      persistSlice(get())
    },

    setCurrentTask(id) {
      set({ currentTaskId: id })
      persistSlice(get())
    },
  }
})
