import { create } from 'zustand'
import type { ScrumMasterSettings, Settings, ThemeName } from '../types'
import { storage } from '../services/storage'

export const DEFAULT_SETTINGS: Settings = {
  onboardingComplete: false,
  oobeGuidedDemoPending: false,
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
  profileName: '',
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
    personality: 'warm',
    sprintTitle: '',
    sprintGoal: '',
  },
  scrumMasterGateComplete: true,
  scrumMasterGatePromptVersion: 3,
}

export const SM_GATE_PROMPT_VERSION = 3

const saved = storage.getSettings()
const savedPromptVer =
  typeof saved.scrumMasterGatePromptVersion === 'number' ? saved.scrumMasterGatePromptVersion : 1
const migratedGateIncomplete =
  savedPromptVer < SM_GATE_PROMPT_VERSION && Boolean(saved.onboardingComplete)

const initial: Settings = {
  ...DEFAULT_SETTINGS,
  ...saved,
  scrumMaster: (() => {
    const merged = { ...DEFAULT_SETTINGS.scrumMaster, ...saved.scrumMaster } as Record<string, unknown>
    delete merged.sprintEndDate
    let sm = merged as unknown as ScrumMasterSettings
    if ((sm.personality as string) === 'stern') {
      sm = { ...sm, personality: 'snarky' }
    }
    return sm
  })(),
  scrumMasterGateComplete: migratedGateIncomplete
    ? false
    : (saved.scrumMasterGateComplete ?? DEFAULT_SETTINGS.scrumMasterGateComplete),
  scrumMasterGatePromptVersion: Math.max(SM_GATE_PROMPT_VERSION, savedPromptVer),
}

if (migratedGateIncomplete) {
  storage.saveSettings(initial)
}

if ((saved.scrumMaster as { personality?: string } | undefined)?.personality === 'stern') {
  storage.saveSettings(initial)
}

type SettingsState = {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: initial,

  updateSettings(patch) {
    const prev = get().settings
    let next: Settings = { ...prev, ...patch }
    if (patch.scrumMaster) {
      next = { ...next, scrumMaster: { ...prev.scrumMaster, ...patch.scrumMaster } }
    }

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
      oobeGuidedDemoPending: prev.oobeGuidedDemoPending,
      profileName: prev.profileName,
      scrumMasterGateComplete: prev.scrumMasterGateComplete,
      scrumMasterGatePromptVersion: prev.scrumMasterGatePromptVersion,
      scrumMaster: prev.scrumMaster,
    }
    set({ settings: next })
    storage.saveSettings(next)
  },
}))

export function getSettingsSnapshot(): Settings {
  return useSettingsStore.getState().settings
}
