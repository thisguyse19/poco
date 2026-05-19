import { create } from 'zustand'
import type { Task } from '../types'
import { buildOobeDemoTasks } from '../utils/oobeDemoTasks'
import { useTaskStore } from './taskStore'
import { useSettingsStore } from './settingsStore'

export type OobeTryKind = 'quickadd_submitted' | 'swipe_reschedule' | 'week_drag' | 'focus_pick'

export type OobeTourStepDef = {
  path: string
  /** `data-oobe` value to scroll into view and outline; omit for none */
  anchor: string | null
  title: string
  body: string
  /** When set, performing this action advances the tour (still use Next to skip). */
  tryThis?: OobeTryKind
}

export const OOBE_TOUR_STEPS: OobeTourStepDef[] = [
  {
    path: '/',
    anchor: null,
    title: 'Welcome',
    body: 'These are sample tasks—nothing you do here is permanent until the tour ends. Explore freely: the app stays fully usable. Tap Next when you are ready for your first hands-on step.',
  },
  {
    path: '/',
    anchor: 'quickadd',
    title: 'Quick add — your turn',
    body: 'Use the dashed bar: type a short task (for example “Buy oat milk”) and press Enter or the check mark. The tour moves on automatically when a new task is added.',
    tryThis: 'quickadd_submitted',
  },
  {
    path: '/',
    anchor: 'tasklist',
    title: 'Swipe — your turn',
    body: 'Swipe a demo row sideways (or use the Later / Tomorrow buttons that appear). Try it on any sample task—the tour advances when you reschedule one.',
    tryThis: 'swipe_reschedule',
  },
  {
    path: '/week',
    anchor: 'week',
    title: 'Week planner — your turn',
    body: 'Hold a task until it lifts, then drop it on a day or on Unscheduled. The tour advances after your first successful drop.',
    tryThis: 'week_drag',
  },
  {
    path: '/focus',
    anchor: 'focus',
    title: 'Focus — your turn',
    body: 'Tap “Pick task”, choose any demo task, then close the sheet. The tour advances when a task is linked.',
    tryThis: 'focus_pick',
  },
  {
    path: '/',
    anchor: null,
    title: 'You are set',
    body: 'Sample tasks are gone and your previous list is back. Explore Settings whenever you want to tune behaviour.',
  },
]

type OobeTourState = {
  active: boolean
  stepIndex: number
  savedTasks: Task[] | null
  consumePendingOnFinish: boolean
  start: (savedTasks: Task[], consumePendingOnFinish: boolean) => void
  nextStep: () => void
  skipTour: () => void
  finishTour: () => void
  /** When the current step’s `tryThis` matches, advance automatically. */
  reportTry: (kind: OobeTryKind) => void
}

export const useOobeTourStore = create<OobeTourState>((set, get) => ({
  active: false,
  stepIndex: 0,
  savedTasks: null,
  consumePendingOnFinish: false,

  start(savedTasks, consumePendingOnFinish) {
    useTaskStore.getState().replaceTasks(buildOobeDemoTasks())
    set({
      active: true,
      stepIndex: 0,
      savedTasks: structuredClone(savedTasks),
      consumePendingOnFinish,
    })
  },

  nextStep() {
    const { stepIndex } = get()
    if (stepIndex >= OOBE_TOUR_STEPS.length - 1) {
      get().finishTour()
      return
    }
    set({ stepIndex: stepIndex + 1 })
  },

  skipTour() {
    get().finishTour()
  },

  finishTour() {
    const { savedTasks, consumePendingOnFinish } = get()
    if (savedTasks) {
      useTaskStore.getState().replaceTasks(structuredClone(savedTasks))
    }
    if (consumePendingOnFinish) {
      useSettingsStore.getState().updateSettings({ oobeGuidedDemoPending: false })
    }
    set({
      active: false,
      stepIndex: 0,
      savedTasks: null,
      consumePendingOnFinish: false,
    })
  },

  reportTry(kind) {
    const { active, stepIndex } = get()
    if (!active) return
    const step = OOBE_TOUR_STEPS[stepIndex]
    if (!step?.tryThis || step.tryThis !== kind) return
    get().nextStep()
  },
}))
