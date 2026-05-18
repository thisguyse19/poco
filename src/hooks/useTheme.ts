import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

const THEME_COLOR: Record<string, string> = {
  light: '#f5f2ed',
  dark: '#1e1c1a',
  shrouded: '#000000',
}

/**
 * Applies data-theme, data-density, data-reduce-motion on <html>
 * and keeps theme-color meta in sync. Must run on every route including onboarding.
 */
export function useTheme() {
  const theme = useSettingsStore((s) => s.settings.theme)
  const density = useSettingsStore((s) => s.settings.density)
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.density = density
    root.dataset.reduceMotion = String(reduceMotion)

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', THEME_COLOR[theme] ?? THEME_COLOR.light)
    }
  }, [theme, density, reduceMotion])
}
