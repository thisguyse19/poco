import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '../components/tasks/PageHeader'
import { TimerControls } from '../components/focus/TimerControls'
import { FocusStats } from '../components/focus/FocusStats'
import { PocoBottomSheet } from '../components/ui/PocoBottomSheet'
import { Icon } from '../components/ui/Icon'
import { useTimer } from '../hooks/useTimer'
import { useSettingsStore } from '../stores/settingsStore'
import { useTaskStore } from '../stores/taskStore'
import { ambientController } from '../utils/ambient'

const FOCUS_HINTS = [
  'Mute other apps before you start—depth beats context switching.',
  'Use breaks to stand and look away from the screen, not to scroll feeds.',
  'One finished block beats five half-started ones.',
  'Let the ring be a boundary: inside it, only this.',
  'Your backlog can wait; this slice of time cannot.',
] as const

export function FocusPage() {
  const location = useLocation()
  const tasks = useTaskStore((s) => s.tasks)
  const settings = useSettingsStore((s) => s.settings)
  const {
    mode,
    isRunning,
    progress,
    formatted,
    sessionsCompleted,
    focusSessionsInCycle,
    start,
    pause,
    reset,
    skipToNextPhase,
    setCurrentTask,
    currentTaskId,
  } = useTimer()

  const [pickerOpen, setPickerOpen] = useState(false)
  const compactTimer = settings.density === 'compact'

  const active = tasks.find((t) => t.id === currentTaskId)

  const subtitle = useMemo(() => {
    const i = sessionsCompleted % FOCUS_HINTS.length
    return FOCUS_HINTS[i] ?? FOCUS_HINTS[0]
  }, [sessionsCompleted])

  useEffect(() => {
    const on = isRunning && mode === 'focus' && settings.ambientSound !== 'off'
    ambientController.set(settings.ambientSound, on)
    return () => ambientController.set('off', false)
  }, [isRunning, mode, settings.ambientSound])

  useEffect(() => {
    let sentinel: { release: () => Promise<void> } | undefined
    const run = async () => {
      if (!settings.keepScreenAwake || !isRunning || mode !== 'focus') return
      if ('wakeLock' in navigator) {
        try {
          sentinel = (await (
            navigator as Navigator & { wakeLock: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
          ).wakeLock.request('screen')) as { release: () => Promise<void> }
        } catch {
          /* */
        }
      }
    }
    void run()
    return () => {
      void sentinel?.release()
    }
  }, [settings.keepScreenAwake, isRunning, mode])

  const hideHeader = location.pathname === '/focus' && isRunning

  const pickControl = (
    <button
      type="button"
      onClick={() => setPickerOpen(true)}
      className={`poco-press flex max-w-[13rem] min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-left text-xs font-semibold ${
        active
          ? 'border-[var(--accent)]/70 bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
      }`}
    >
      <Icon name="plus" size={16} className={active ? 'opacity-80' : 'text-[var(--accent)]'} />
      <span className="min-w-0 truncate">{active?.title ?? 'Pick task'}</span>
    </button>
  )

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {!hideHeader ? (
        <PageHeader title="Focus" subtitle={subtitle} rightSlot={pickControl} />
      ) : (
        <div className="pointer-events-none absolute right-4 top-[max(1rem,env(safe-area-inset-top,0px))] z-20 md:right-6">
          <div className="pointer-events-auto">{pickControl}</div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pb-[calc(var(--poco-mobile-nav-height)+0.5rem)] pt-4">
        <TimerControls
          mode={mode}
          isRunning={isRunning}
          progress={progress}
          formatted={formatted}
          sessionsCompleted={sessionsCompleted}
          focusSessionsInCycle={focusSessionsInCycle}
          compact={compactTimer}
          onToggle={() => {
            if (isRunning) pause()
            else start()
          }}
          onReset={reset}
          onSkip={skipToNextPhase}
        />
        <FocusStats />
      </div>

      <PocoBottomSheet open={pickerOpen} onBackdropClick={() => setPickerOpen(false)}>
        <div className="p-4 pb-6 max-md:pb-[calc(var(--poco-mobile-nav-height)+0.5rem)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-serif text-lg">Choose task</p>
            <button type="button" className="poco-press p-2 text-[var(--text-tertiary)]" aria-label="Close" onClick={() => setPickerOpen(false)}>
              <Icon name="x" size={20} />
            </button>
          </div>
          <div className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
            {tasks
              .filter((t) => !t.completed)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="poco-press rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-3 text-left text-sm font-medium"
                  onClick={() => {
                    setCurrentTask(t.id)
                    setPickerOpen(false)
                  }}
                >
                  {t.title}
                </button>
              ))}
          </div>
          <button
            type="button"
            className="poco-press mt-3 w-full rounded-[var(--radius-sm)] border border-dashed border-[var(--border-default)] py-2 text-xs font-semibold text-[var(--text-secondary)]"
            onClick={() => {
              setCurrentTask(null)
              setPickerOpen(false)
            }}
          >
            No linked task
          </button>
        </div>
      </PocoBottomSheet>
    </div>
  )
}
