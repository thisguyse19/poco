import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '../components/tasks/PageHeader'
import { TimerControls } from '../components/focus/TimerControls'
import { FocusStats } from '../components/focus/FocusStats'
import { useTimer } from '../hooks/useTimer'
import { useSettingsStore } from '../stores/settingsStore'
import { useTaskStore } from '../stores/taskStore'
import { ambientController } from '../utils/ambient'

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
  const density = settings.density === 'compact'

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

  const active = tasks.find((t) => t.id === currentTaskId)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={`overflow-hidden transition-all duration-200 ${
          location.pathname === '/focus' && isRunning ? 'max-h-0 -translate-y-full opacity-0 pointer-events-none' : 'max-h-40 opacity-100'
        }`}
      >
        <PageHeader
          title="Focus"
          subtitle="Pomodoro timer linked to your tasks."
          rightSlot={
            <button
              type="button"
              className="poco-press rounded-[var(--radius-sm)] border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
              onClick={() => setPickerOpen(true)}
            >
              {active?.title ?? 'Pick task'}
            </button>
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pb-[calc(var(--poco-mobile-nav-height)+0.5rem)] pt-4">
        <TimerControls
          mode={mode}
          isRunning={isRunning}
          progress={progress}
          formatted={formatted}
          sessionsCompleted={sessionsCompleted}
          focusSessionsInCycle={focusSessionsInCycle}
          compact={density}
          onToggle={() => {
            if (isRunning) pause()
            else start()
          }}
          onReset={reset}
          onSkip={skipToNextPhase}
        />
        <FocusStats />
      </div>

      {pickerOpen
        ? createPortal(
            <div className="fixed inset-0 z-[110] flex animate-fadeIn flex-col justify-end">
              <button
                type="button"
                aria-label="Close"
                className="absolute left-0 right-0 top-0 max-md:bottom-[var(--poco-mobile-nav-height)] md:bottom-0 bg-black/30 backdrop-blur-[1px]"
                onClick={() => setPickerOpen(false)}
              />
              <div className="relative z-[1] mx-auto max-h-[60dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-xl animate-slideUp max-md:mb-[var(--poco-mobile-nav-height)]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-serif text-lg">Choose task</p>
                  <button type="button" className="poco-press p-2 text-[var(--text-tertiary)]" onClick={() => setPickerOpen(false)}>
                    ✕
                  </button>
                </div>
                <div className="flex flex-col gap-1">
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
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
