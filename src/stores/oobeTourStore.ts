import { create } from 'zustand'
import type { Task } from '../types'
import { buildOobeDemoTasks } from '../utils/oobeDemoTasks'
import { useTaskStore } from './taskStore'
import { useSettingsStore } from './settingsStore'

export type OobeTourStepDef = {
  path: string
  /** `data-oobe` value to scroll into view and outline; omit for none */
  anchor: string | null
  title: string
  body: string
}

export const OOBE_TOUR_STEPS: OobeTourStepDef[] = [
  {
    path: '/',
    anchor: null,
    title: 'Welcome',
    body: 'For the next minute you will see sample tasks. They are removed when you finish or skip the tour, and your real task list is restored.',
  },
  {
    path: '/',
    anchor: 'quickadd',
    title: 'Quick add',
    body: 'Tap the dashed bar, type a task in everyday language (dates and categories work), then press Enter or the check mark.',
  },
  {
    path: '/',
    anchor: 'tasklist',
    title: 'Swipe to rearrange',
    body: 'Drag a row sideways to reveal Later, Tomorrow, and Delete. That is how you reshuffle work without opening a task.',
  },
  {
    path: '/week',
    anchor: 'week',
    title: 'Week planner',
    body: 'Hold a task briefly, then drag it onto a day (or Unscheduled) to set when you plan to do it.',
  },
  {
    path: '/focus',
    anchor: 'focus',
    title: 'Focus',
    body: 'Link a task to the timer for a focused block. Start when you are ready for uninterrupted work.',
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
}))
