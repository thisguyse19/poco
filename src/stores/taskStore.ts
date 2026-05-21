import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Priority, ScheduledFor, Task } from '../types'
import { storage, toLocalISODate } from '../services/storage'
import { rolloverTomorrowToTodayIfNeeded } from '../utils/scheduleDayRollover'
import { patchTaskForPlanDate } from '../utils/weekPlanner'

type TaskState = {
  tasks: Task[]
  /** No-op unless the local calendar day advanced; then tomorrow → today. */
  ensureScheduleDayRollover: () => void
  /** Replace the entire task list (used for OOBE demo / restore). */
  replaceTasks: (tasks: Task[]) => void
  addTask: (partial: Partial<Task> & Pick<Task, 'title'>) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  restoreTask: (task: Task) => void
  setSchedule: (id: string, horizon: ScheduledFor) => void
  setPriority: (id: string, priority: Priority) => void
  pinTask: (id: string) => void
  unpinTask: (id: string) => void
  toggleComplete: (id: string) => void
  rescheduleLaterToday: (id: string) => void
  rescheduleTomorrow: (id: string) => void
  /** Week planner: assign task to a calendar day and align `scheduledFor` with Home buckets. */
  planTaskOnDate: (id: string, targetIsoDate: string) => void
  /** Week planner: remove calendar date; inbox stays inbox, otherwise Someday. */
  clearWeekPlan: (id: string) => void
}

const nowIso = () => new Date().toISOString()

function sortTasksForToday(a: Task, b: Task): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
}

export function sortTodayTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(sortTasksForToday)
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: (() => {
    const initial = storage.getTasks()
    const { tasks: rolled, changed } = rolloverTomorrowToTodayIfNeeded(initial)
    if (changed) storage.saveTasks(rolled)
    return rolled
  })(),

  ensureScheduleDayRollover() {
    const { tasks: rolled, changed } = rolloverTomorrowToTodayIfNeeded(get().tasks)
    if (changed) {
      set({ tasks: rolled })
      storage.saveTasks(rolled)
    }
  },

  replaceTasks(tasks) {
    const { tasks: rolled } = rolloverTomorrowToTodayIfNeeded(tasks)
    set({ tasks: rolled })
    storage.saveTasks(rolled)
  },

  addTask(partial) {
    const ts = nowIso()
    const task: Task = {
      id: uuidv4(),
      title: partial.title.trim() || 'Untitled',
      description: partial.description,
      notes: partial.notes,
      category: (partial.category ?? 'General').trim() || 'General',
      priority: partial.priority ?? 'medium',
      pinned: partial.pinned ?? false,
      completed: false,
      completedAt: null,
      createdAt: partial.createdAt ?? ts,
      updatedAt: ts,
      scheduledFor: partial.scheduledFor ?? 'today',
      dueDate: partial.dueDate ?? null,
      dueTime: partial.dueTime ?? null,
      recurrence: partial.recurrence ?? null,
      estimatedPomodoros: partial.estimatedPomodoros ?? 0,
      actualPomodoros: partial.actualPomodoros ?? 0,
    }
    const tasks = [task, ...get().tasks]
    set({ tasks })
    storage.saveTasks(tasks)
    return task
  },

  updateTask(id, patch) {
    const tasks = get().tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            ...patch,
            title: patch.title !== undefined ? patch.title.trim() || 'Untitled' : t.title,
            category:
              patch.category !== undefined
                ? patch.category.trim() || 'General'
                : t.category,
            updatedAt: nowIso(),
          }
        : t,
    )
    set({ tasks })
    storage.saveTasks(tasks)
  },

  restoreTask(task: Task) {
    const others = get().tasks.filter((t) => t.id !== task.id)
    const tasks = [task, ...others]
    set({ tasks })
    storage.saveTasks(tasks)
  },

  deleteTask(id) {
    const tasks = get().tasks.filter((t) => t.id !== id)
    set({ tasks })
    storage.saveTasks(tasks)
  },

  setSchedule(id, horizon) {
    get().updateTask(id, { scheduledFor: horizon })
  },

  setPriority(id, priority) {
    get().updateTask(id, { priority })
  },

  pinTask(id) {
    get().updateTask(id, { pinned: true })
  },

  unpinTask(id) {
    get().updateTask(id, { pinned: false })
  },

  toggleComplete(id) {
    const t = get().tasks.find((x) => x.id === id)
    if (!t) return
    const ts = nowIso()
    if (t.completed) {
      get().updateTask(id, { completed: false, completedAt: null })
    } else {
      get().updateTask(id, { completed: true, completedAt: ts })
    }
  },

  rescheduleLaterToday(id) {
    get().updateTask(id, {
      scheduledFor: 'today',
      dueDate: toLocalISODate(),
    })
  },

  rescheduleTomorrow(id) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    get().updateTask(id, {
      scheduledFor: 'tomorrow',
      dueDate: `${y}-${m}-${day}`,
    })
  },

  planTaskOnDate(id, targetIsoDate) {
    const today = toLocalISODate()
    const patch = patchTaskForPlanDate(targetIsoDate, today)
    get().updateTask(id, patch)
  },

  clearWeekPlan(id) {
    const t = get().tasks.find((x) => x.id === id)
    if (!t) return
    const scheduledFor: ScheduledFor = t.scheduledFor === 'inbox' ? 'inbox' : 'someday'
    get().updateTask(id, { dueDate: null, scheduledFor })
  },
}))
