import { useSettingsStore } from '../stores/settingsStore'

export function triggerHaptic(pattern: number | number[] = 12) {
  const on = useSettingsStore.getState().settings.haptics
  if (!on || typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}
