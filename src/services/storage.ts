import type { FocusSession, LegacyTask, Settings, Task, TimerState } from '../types'

const KEYS = {
  tasks: 'poco:tasks',
  settings: 'poco:settings',
  timer: 'poco:timer',
  sessions: 'poco:sessions',
  categoryExpanded: 'poco:category-expanded',
} as const

function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw == null || raw === '') return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function toLocalISODate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function migrateTask(raw: unknown): Task {
  const t = raw as LegacyTask & Partial<Task>
  const now = new Date().toISOString()
  let dueDate = t.dueDate ?? null
  if (t.dueToday === true && !dueDate) {
    dueDate = toLocalISODate()
  }
  const category = (t.category ?? 'General').trim() || 'General'
  return {
    id: String(t.id ?? crypto.randomUUID()),
    title: String(t.title ?? '').trim() || 'Untitled',
    description: t.description?.trim() || undefined,
    notes: t.notes?.trim() || undefined,
    category,
    priority: t.priority ?? 'medium',
    pinned: Boolean(t.pinned),
    completed: Boolean(t.completed),
    completedAt: t.completedAt ?? null,
    createdAt: t.createdAt ?? now,
    updatedAt: t.updatedAt ?? now,
    scheduledFor: t.scheduledFor ?? 'today',
    dueDate,
    dueTime: t.dueTime ?? null,
    recurrence: t.recurrence ?? null,
    estimatedPomodoros: Number(t.estimatedPomodoros ?? 0) || 0,
    actualPomodoros: Number(t.actualPomodoros ?? 0) || 0,
  }
}

export const storage = {
  keys: KEYS,

  getTasks(): Task[] {
    const parsed = safeParse<unknown[]>(localStorage.getItem(KEYS.tasks), [])
    return Array.isArray(parsed) ? parsed.map(migrateTask) : []
  },

  saveTasks(tasks: Task[]) {
    localStorage.setItem(KEYS.tasks, JSON.stringify(tasks))
  },

  getSettings(): Partial<Settings> {
    return safeParse<Partial<Settings>>(localStorage.getItem(KEYS.settings), {})
  },

  saveSettings(s: Settings) {
    localStorage.setItem(KEYS.settings, JSON.stringify(s))
  },

  getTimer(): Partial<TimerState> | null {
    const v = localStorage.getItem(KEYS.timer)
    if (v == null) return null
    return safeParse<Partial<TimerState>>(v, {})
  },

  saveTimer(t: TimerState) {
    localStorage.setItem(KEYS.timer, JSON.stringify(t))
  },

  getSessions(): FocusSession[] {
    const parsed = safeParse<unknown[]>(localStorage.getItem(KEYS.sessions), [])
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is FocusSession => {
      const s = x as FocusSession
      return typeof s?.id === 'string' && typeof s?.startedAt === 'string'
    })
  },

  saveSessions(sessions: FocusSession[]) {
    localStorage.setItem(KEYS.sessions, JSON.stringify(sessions))
  },

  getCategoryExpanded(): Record<string, boolean> {
    return safeParse<Record<string, boolean>>(
      localStorage.getItem(KEYS.categoryExpanded),
      {},
    )
  },

  saveCategoryExpanded(map: Record<string, boolean>) {
    localStorage.setItem(KEYS.categoryExpanded, JSON.stringify(map))
  },

  exportAll() {
    return {
      tasks: this.getTasks(),
      settings: { ...DEFAULT_EXPORT_SETTINGS, ...this.getSettings() } as Settings,
      sessions: this.getSessions(),
      exportedAt: new Date().toISOString(),
    }
  },

  importAll(data: Partial<{ tasks: unknown[]; settings: Partial<Settings>; sessions: unknown[] }>) {
    if (Array.isArray(data.tasks)) {
      this.saveTasks(data.tasks.map(migrateTask))
    }
    if (data.settings && typeof data.settings === 'object') {
      const merged = { ...DEFAULT_EXPORT_SETTINGS, ...this.getSettings(), ...data.settings } as Settings
      this.saveSettings(merged)
    }
    if (Array.isArray(data.sessions)) {
      const sessions = data.sessions.filter((x): x is FocusSession => {
        const s = x as FocusSession
        return typeof s?.id === 'string'
      })
      this.saveSessions(sessions)
    }
  },

  clearAll() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
  },
}

/** Defaults used when merging partial import */
const DEFAULT_EXPORT_SETTINGS: Settings = {
  onboardingComplete: true,
  theme: 'light',
  density: 'default',
  fontScale: 'md',
  reduceMotion: false,
  haptics: true,
  ambientSound: 'off',
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  landingView: 'tasks',
  profileName: 'You',
  oledOptimisation: false,
  reviewDismissedAt: null,
  endOfDayReviewHour: 20,
  confirmDelete: true,
  autoStartBreaks: false,
  autoStartNext: false,
  keepScreenAwake: false,
  scrumMaster: {
    enabled: true,
    gender: 'female',
    name: 'Maya',
    standUpTime: '09:00',
    standDownTime: '17:30',
  },
}
