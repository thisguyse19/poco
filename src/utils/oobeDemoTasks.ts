import { v4 as uuidv4 } from 'uuid'
import type { Task } from '../types'
import { toLocalISODate } from '../services/storage'

const nowIso = () => new Date().toISOString()

function tomorrowIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toLocalISODate(d)
}

/** Sample tasks for the first-run / dev-lab guided tour. Replaced entirely when the tour ends. */
export function buildOobeDemoTasks(): Task[] {
  const ts = nowIso()
  const today = toLocalISODate()
  const tomorrow = tomorrowIso()

  const mk = (title: string, scheduledFor: Task['scheduledFor'], dueDate: string | null): Task => ({
    id: uuidv4(),
    title,
    description: undefined,
    notes: undefined,
    category: 'Demo',
    priority: 'medium',
    pinned: false,
    completed: false,
    completedAt: null,
    createdAt: ts,
    updatedAt: ts,
    scheduledFor,
    dueDate,
    dueTime: null,
    recurrence: null,
    estimatedPomodoros: 0,
    actualPomodoros: 0,
  })

  return [
    mk('Demo · Swipe this row to move it (Later, Tomorrow, or delete)', 'today', today),
    mk('Demo · Tap the + bar above to add a task in plain English', 'today', today),
    mk('Demo · Open Week in the tab bar to drag tasks onto dates', 'today', today),
    mk('Demo · This one is on tomorrow — try it in Week view', 'tomorrow', tomorrow),
  ]
}
