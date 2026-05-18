import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useTimerStore } from '../stores/timerStore'
import type { DensityName, LandingView, ThemeName } from '../types'

const DURATIONS = [15, 20, 25, 30, 45] as const

export function OnboardingPage() {
  const navigate = useNavigate()
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const [step, setStep] = useState(0)
  const [theme, setTheme] = useState<ThemeName>('light')
  const [density, setDensity] = useState<DensityName>('default')
  const [landing, setLanding] = useState<LandingView>('tasks')
  const [duration, setDuration] = useState(25)
  const [haptics, setHaptics] = useState(true)
  const [name, setName] = useState('')

  const skipFromStart = () => {
    updateSettings({ onboardingComplete: true })
    useTimerStore.getState().refreshDurationForMode()
    navigate('/')
  }

  const finish = () => {
    const profileName = name.trim() || 'You'
    updateSettings({
      onboardingComplete: true,
      profileName,
      theme,
      density,
      landingView: landing,
      focusDurationMinutes: duration,
      haptics,
    })
    useTimerStore.getState().refreshDurationForMode()
    navigate(landing === 'focus' ? '/focus' : '/')
  }

  const applyAppearance = () => {
    updateSettings({ theme, density })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="poco-content-max flex flex-1 flex-col px-4 py-10">
        <div className="mb-8 flex justify-center gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i === step ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h1 className="font-serif text-3xl">Welcome to poco</h1>
            <p className="text-[var(--text-secondary)]">
              A calm place for tasks and focus sessions. Everything stays on this device.
            </p>
            <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button type="button" className="poco-press text-sm font-semibold text-[var(--text-secondary)]" onClick={skipFromStart}>
                Skip
              </button>
              <button
                type="button"
                className="poco-press rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)]"
                onClick={() => setStep(1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h2 className="font-serif text-2xl">Capture fast</h2>
            <p className="text-[var(--text-secondary)]">
              Add tasks in seconds, organise lightly with horizons and categories, and come back when you are ready.
            </p>
            <div className="mt-auto flex justify-between gap-3">
              <button type="button" className="poco-press text-sm font-semibold" onClick={() => setStep(0)}>
                Back
              </button>
              <button
                type="button"
                className="poco-press rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)]"
                onClick={() => setStep(2)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h2 className="font-serif text-2xl">Focus deeply</h2>
            <p className="text-[var(--text-secondary)]">
              Pomodoro-style sessions with gentle visuals. No accounts and no cloud in this version—just your rhythm.
            </p>
            <div className="mt-auto flex justify-between gap-3">
              <button type="button" className="poco-press text-sm font-semibold" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="poco-press rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)]"
                onClick={() => setStep(3)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h2 className="font-serif text-2xl">Look &amp; density</h2>
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Theme</p>
                <div className="flex flex-wrap gap-2">
                  {(['light', 'dark', 'shrouded'] as ThemeName[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTheme(t)
                        updateSettings({ theme: t })
                      }}
                      className={`poco-press rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-semibold capitalize ${
                        theme === t
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Density</p>
                <div className="flex flex-wrap gap-2">
                  {(['compact', 'default', 'relaxed'] as DensityName[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDensity(d)
                        updateSettings({ density: d })
                      }}
                      className={`poco-press rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-semibold capitalize ${
                        density === d
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-auto flex justify-between gap-3">
              <button type="button" className="poco-press text-sm font-semibold" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                type="button"
                className="poco-press rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)]"
                onClick={() => {
                  applyAppearance()
                  setStep(4)
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h2 className="font-serif text-2xl">Rhythm</h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Landing</p>
                <div className="flex gap-2">
                  {(['tasks', 'focus'] as LandingView[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setLanding(v)}
                      className={`poco-press flex-1 rounded-[var(--radius-sm)] border py-2 text-xs font-semibold capitalize ${
                        landing === v
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Focus length (minutes)
                </p>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m)}
                      className={`poco-press min-w-[2.75rem] rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-semibold ${
                        duration === m
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 text-sm">
                <span>Haptics</span>
                <input type="checkbox" checked={haptics} onChange={(e) => setHaptics(e.target.checked)} />
              </label>
            </div>
            <div className="mt-auto flex justify-between gap-3">
              <button type="button" className="poco-press text-sm font-semibold" onClick={() => setStep(3)}>
                Back
              </button>
              <button
                type="button"
                className="poco-press rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)]"
                onClick={() => setStep(5)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h2 className="font-serif text-2xl">Profile</h2>
            <p className="text-sm text-[var(--text-secondary)]">How should we greet you in the sidebar?</p>
            <input
              className="poco-input w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-3 text-sm"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="mt-auto flex justify-between gap-3">
              <button type="button" className="poco-press text-sm font-semibold" onClick={() => setStep(4)}>
                Back
              </button>
              <button
                type="button"
                className="poco-press rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)]"
                onClick={finish}
              >
                Enter poco
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
