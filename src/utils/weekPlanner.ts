import type { ScheduledFor, Task } from '../types'
import { toLocalISODate } from '../services/storage'

export type WeekPlannerPlacement = { kind: 'day'; iso: string } | { kind: 'unscheduled' }

/** Monday = 1, Sunday = 7 per `Intl.Locale` weekInfo where available. */
export function getWeekFirstDayFromLocale(): 1 | 7 {
  try {
    const Loc = Intl.Locale as typeof Intl.Locale & {
      prototype: Intl.Locale & { weekInfo?: { firstDay: number } }
    }
    if (typeof Loc === 'function') {
      const loc = new Loc('en-GB') as Intl.Locale & { weekInfo?: { firstDay: number } }
      const fd = loc.weekInfo?.firstDay
      if (fd === 7) return 7
    }
  } catch {
    /* ignore */
  }
  return 1
}

/** Local midnight anchor for the first day of the wall week containing `anchor`. */
export function startOfWeekWall(anchor: Date, firstDay: 1 | 7): Date {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  const dow = d.getDay()
  const offset = firstDay === 7 ? dow : (dow + 6) % 7
  d.setDate(d.getDate() - offset)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addCalendarDaysFromIso(baseIso: string, deltaDays: number): string {
  const [y, m, d] = baseIso.split('-').map(Number)
  if (!y || !m || !d) return baseIso
  const x = new Date(y, m - 1, d + deltaDays)
  return toLocalISODate(x)
}

export function tomorrowIsoFrom(todayIso: string): string {
  return addCalendarDaysFromIso(todayIso, 1)
}

export function weekIsoListFromStart(weekStart: Date): string[] {
  const y = weekStart.getFullYear()
  const mo = weekStart.getMonth()
  const da = weekStart.getDate()
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    out.push(toLocalISODate(new Date(y, mo, da + i)))
  }
  return out
}

export function patchTaskForPlanDate(
  targetIso: string,
  todayIso: string,
): { dueDate: string; scheduledFor: ScheduledFor } {
  let date = targetIso
  if (targetIso < todayIso) {
    date = todayIso
  }
  const tomorrowIso = tomorrowIsoFrom(todayIso)
  let scheduledFor: ScheduledFor
  if (date === todayIso) scheduledFor = 'today'
  else if (date === tomorrowIso) scheduledFor = 'tomorrow'
  else scheduledFor = 'someday'
  return { dueDate: date, scheduledFor }
}

export function taskWeekPlacement(
  task: Task,
  ctx: { todayIso: string; tomorrowIso: string; showCompleted: boolean },
): WeekPlannerPlacement | null {
  if (!ctx.showCompleted && task.completed) return null
  if (task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
    return { kind: 'day', iso: task.dueDate }
  }
  if (task.scheduledFor === 'today') return { kind: 'day', iso: ctx.todayIso }
  if (task.scheduledFor === 'tomorrow') return { kind: 'day', iso: ctx.tomorrowIso }
  if (task.scheduledFor === 'inbox' || task.scheduledFor === 'someday') return { kind: 'unscheduled' }
  return null
}

export function sortWeekColumnTasks(a: Task, b: Task): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}
