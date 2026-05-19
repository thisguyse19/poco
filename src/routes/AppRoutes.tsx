import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useSettingsStore } from '../stores/settingsStore'
import { useTimerStore } from '../stores/timerStore'
import { AppLayout } from '../layouts/AppLayout'
import { HomePage } from '../pages/HomePage'
import { FocusPage } from '../pages/FocusPage'
import { SettingsPage } from '../pages/SettingsPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { ScrumMasterSetupPage } from '../pages/ScrumMasterSetupPage'

export function AppRoutes() {
  useTheme()
  const onboardingComplete = useSettingsStore((s) => s.settings.onboardingComplete)
  const focusMin = useSettingsStore((s) => s.settings.focusDurationMinutes)
  const shortMin = useSettingsStore((s) => s.settings.shortBreakMinutes)
  const longMin = useSettingsStore((s) => s.settings.longBreakMinutes)

  useEffect(() => {
    useTimerStore.getState().refreshDurationForMode()
  }, [focusMin, shortMin, longMin])

  if (!onboardingComplete) {
    return <OnboardingPage />
  }

  return (
    <Routes>
      <Route path="/scrum-master-setup" element={<ScrumMasterSetupPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="focus" element={<FocusPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
