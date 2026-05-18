import { create } from 'zustand'
import type { Settings, ThemeName } from '../types'
import { storage } from '../services/storage'

export const DEFAULT_SETTINGS: Settings = {
  onboardingComplete: false,
  theme: 'light',
  density: 'default',
  reduceMotion: false,
  haptics: true,
  ambientSound: 'off',
  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  landingView: 'tasks',
  profileName: '',
  oledOptimisation: false,
  reviewDismissedAt: null,
  endOfDayReviewHour: 20,
  confirmDelete: true,
  autoStartBreaks: false,
  autoStartNext: false,
  keepScreenAwake: false,
}

const saved = storage.getSettings()
const initial: Settings = { ...DEFAULT_SETTINGS, ...saved }

type SettingsState = {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: initial,

  updateSettings(patch) {
    let next = { ...get().settings, ...patch }

    if (patch.oledOptimisation === true) {
      next = { ...next, theme: 'shrouded' as ThemeName }
    }
    if (patch.oledOptimisation === false && next.theme === 'shrouded') {
      next = { ...next, theme: 'dark' as ThemeName }
    }

    set({ settings: next })
    storage.saveSettings(next)
  },

  resetSettings() {
    const prev = get().settings
    const next = {
      ...DEFAULT_SETTINGS,
      onboardingComplete: prev.onboardingComplete,
      profileName: prev.profileName,
    }
    set({ settings: next })
    storage.saveSettings(next)
  },
}))

export function getSettingsSnapshot(): Settings {
  return useSettingsStore.getState().settings
}
