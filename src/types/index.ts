/** Task priority used for dot + chips */
export type Priority = 'low' | 'medium' | 'high'

/** Ambient loop played during focus when enabled */
export type AmbientSoundType = 'off' | 'rain' | 'white' | 'forest' | 'cafe'

/** Where the task sits in horizon lists */
export type ScheduledFor = 'inbox' | 'today' | 'tomorrow' | 'someday'

/** Optional recurrence (MVP: label + simple interval) */
export interface RecurrenceRule {
  /** e.g. daily, weekly, weekdays */
  label: string
  /** interval in days (1 = every day) */
  intervalDays: number
}

export interface Task {
  id: string
  title: string
  description?: string
  notes?: string
  category: string
  priority: Priority
  pinned: boolean
  completed: boolean
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  scheduledFor: ScheduledFor
  /** Local calendar date YYYY-MM-DD */
  dueDate?: string | null
  dueTime?: string | null
  recurrence: RecurrenceRule | null
  estimatedPomodoros: number
  actualPomodoros: number
}

/** Legacy shape for migration from breve-era storage */
export interface LegacyTask {
  id?: string
  title?: string
  description?: string
  notes?: string
  category?: string
  priority?: Priority
  pinned?: boolean
  completed?: boolean
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
  scheduledFor?: ScheduledFor
  dueDate?: string | null
  dueTime?: string | null
  recurrence?: RecurrenceRule | null
  estimatedPomodoros?: number
  actualPomodoros?: number
  /** Legacy: coerced into dueDate when missing */
  dueToday?: boolean
}

export type ThemeName = 'light' | 'dark' | 'shrouded'

export type DensityName = 'compact' | 'default' | 'relaxed'

export type FontScaleName = 'sm' | 'md' | 'lg'

export type LandingView = 'tasks' | 'focus'

export interface Settings {
  onboardingComplete: boolean
  theme: ThemeName
  density: DensityName
  /** Root rem scale for body copy */
  fontScale: FontScaleName
  reduceMotion: boolean
  haptics: boolean
  ambientSound: AmbientSoundType
  focusDurationMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  landingView: LandingView
  profileName: string
  /** When true, forces shrouded palette; disabling maps shrouded → dark */
  oledOptimisation: boolean
  /** ISO timestamp of last review dismissal */
  reviewDismissedAt: string | null
  /** Hour (0–23) after which end-of-day review may appear */
  endOfDayReviewHour: number
  confirmDelete: boolean
  autoStartBreaks: boolean
  autoStartNext: boolean
  keepScreenAwake: boolean
}

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak'

/**
 * Timer persistence uses wall-clock alignment while running:
 * - `phaseEndsAt` is epoch ms when the active phase should complete.
 * - On resume after reload, remaining = max(0, phaseEndsAt - Date.now()).
 * When paused, `remainingMs` holds the frozen remainder and `phaseEndsAt` is null.
 * @deprecated `pausedRemaining` — legacy mirror of remaining when paused; ignored if remainingMs set.
 */
export interface TimerState {
  mode: TimerMode
  isRunning: boolean
  phaseEndsAt: number | null
  remainingMs: number
  pausedRemaining?: number
  currentTaskId: string | null
  /** Completed focus sessions within current 4-session cycle (0–3) */
  focusSessionsInCycle: number
  /** Lifetime completed focus sessions (for stats display) */
  sessionsCompleted: number
  /** Epoch ms when current running phase began (session analytics) */
  runStartedAt?: number | null
}

export interface FocusSession {
  id: string
  taskId: string | null
  startedAt: string
  endedAt: string
  plannedMinutes: number
  completed: boolean
}
