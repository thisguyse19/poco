import { useMemo } from 'react'
import { storage } from '../../services/storage'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTimerStore } from '../../stores/timerStore'

export function FocusStats() {
  const focusMin = useSettingsStore((s) => s.settings.focusDurationMinutes)
  const sessionsCompleted = useTimerStore((s) => s.sessionsCompleted)

  const { totalMin, count } = useMemo(() => {
    const sessions = storage.getSessions()
    const completed = sessions.filter((s) => s.completed && s.plannedMinutes > 0)
    return {
      totalMin: completed.reduce((acc, s) => acc + s.plannedMinutes, 0),
      count: completed.length,
    }
  }, [sessionsCompleted])

  return (
    <div className="w-full shrink-0 border-t border-[var(--border-subtle)] py-6 text-sm text-[var(--text-secondary)]">
      <p className="font-serif text-lg text-[var(--text-primary)]">Focus log</p>
      <p className="mt-2">
        Logged focus time (approx.): <strong className="text-[var(--text-primary)]">{totalMin}</strong> minutes across{' '}
        <strong className="text-[var(--text-primary)]">{count}</strong> completed sessions.
      </p>
      <p className="mt-1 text-xs text-[var(--text-tertiary)]">Current focus block length: {focusMin} min.</p>
    </div>
  )
}
