import { toLocalISODate } from '../services/storage'
import type { Task } from '../types'

const KEY = 'poco:last-schedule-rollover-local-date'

function nowIso() {
  return new Date().toISOString()
}

/**
 * When the local calendar advances since we last ran, promote `scheduledFor: 'tomorrow'` to
 * `'today'` and align `dueDate` with today so the Tasks page and Ahead stay consistent.
 */
export function rolloverTomorrowToTodayIfNeeded(tasks: Task[]): { tasks: Task[]; changed: boolean } {
  const cur = toLocalISODate()
  let prev: string | null = null
  try {
    prev = localStorage.getItem(KEY)
  } catch {
    /* ignore */
  }
  if (prev === cur) {
    return { tasks, changed: false }
  }
  if (prev === null) {
    const ts = nowIso()
    let changed = false
    const next = tasks.map((t) => {
      if (t.scheduledFor !== 'tomorrow') return t
      const d = t.dueDate
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= cur) {
        changed = true
        return { ...t, scheduledFor: 'today' as const, dueDate: cur, updatedAt: ts }
      }
      return t
    })
    try {
      localStorage.setItem(KEY, cur)
    } catch {
      /* ignore */
    }
    return { tasks: next, changed }
  }
  if (prev > cur) {
    try {
      localStorage.setItem(KEY, cur)
    } catch {
      /* ignore */
    }
    return { tasks, changed: false }
  }

  const todayIso = cur
  const ts = nowIso()
  let changed = false
  const next = tasks.map((t) => {
    if (t.scheduledFor !== 'tomorrow') return t
    changed = true
    return { ...t, scheduledFor: 'today' as const, dueDate: todayIso, updatedAt: ts }
  })
  try {
    localStorage.setItem(KEY, cur)
  } catch {
    /* ignore */
  }
  return { tasks: next, changed }
}
