import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useTimerStore } from '../stores/timerStore'
import type { AmbientSoundType, DensityName, FontScaleName, LandingView, ThemeName } from '../types'

const FOCUS_DURATIONS = [15, 20, 25, 30, 45] as const
const SHORT_BREAKS = [3, 5, 7, 10] as const
const LONG_BREAKS = [10, 15, 20, 25] as const
const STEP_COUNT = 7

function chipClass(active: boolean) {
  return `poco-press rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-semibold capitalize ${
    active
      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
      : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
  }`
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const base = useMemo(() => useSettingsStore.getState().settings, [])

  const [step, setStep] = useState(0)
  const [theme, setTheme] = useState<ThemeName>(base.theme)
  const [density, setDensity] = useState<DensityName>(base.density)
  const [fontScale, setFontScale] = useState<FontScaleName>(base.fontScale)
  const [reduceMotion, setReduceMotion] = useState(base.reduceMotion)
  const [haptics, setHaptics] = useState(base.haptics)
  const [confirmDelete, setConfirmDelete] = useState(base.confirmDelete)
  const [keepScreenAwake, setKeepScreenAwake] = useState(base.keepScreenAwake)
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(base.focusDurationMinutes)
  const [shortBreakMinutes, setShortBreakMinutes] = useState(base.shortBreakMinutes)
  const [longBreakMinutes, setLongBreakMinutes] = useState(base.longBreakMinutes)
  const [ambientSound, setAmbientSound] = useState<AmbientSoundType>(base.ambientSound)
  const [autoStartBreaks, setAutoStartBreaks] = useState(base.autoStartBreaks)
  const [autoStartNext, setAutoStartNext] = useState(base.autoStartNext)
  const [landing, setLanding] = useState<LandingView>(base.landingView)
  const [name, setName] = useState(base.profileName)

  useEffect(() => {
    updateSettings({ theme, density, fontScale })
  }, [theme, density, fontScale, updateSettings])

  useEffect(() => {
    if (step < 4) return
    updateSettings({ reduceMotion, haptics, confirmDelete, keepScreenAwake })
  }, [step, reduceMotion, haptics, confirmDelete, keepScreenAwake, updateSettings])

  useEffect(() => {
    if (step < 5) return
    updateSettings({
      focusDurationMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      ambientSound,
      autoStartBreaks,
      autoStartNext,
    })
    useTimerStore.getState().refreshDurationForMode()
  }, [
    step,
    focusDurationMinutes,
    shortBreakMinutes,
    longBreakMinutes,
    ambientSound,
    autoStartBreaks,
    autoStartNext,
    updateSettings,
  ])

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
      fontScale,
      reduceMotion,
      haptics,
      confirmDelete,
      keepScreenAwake,
      focusDurationMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      ambientSound,
      autoStartBreaks,
      autoStartNext,
      landingView: landing,
    })
    useTimerStore.getState().refreshDurationForMode()
    navigate(landing === 'focus' ? '/focus' : '/')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="poco-content-max flex flex-1 flex-col px-4 py-10">
        <div className="mb-8 flex justify-center gap-1.5">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-none ${i === step ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h1 className="font-serif text-3xl">Welcome to poco</h1>
            <p className="text-[var(--text-secondary)]">
              Tasks and focus, offline-first. The next screens show a few gestures and let you tune how the app feels.
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
                Show me
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h2 className="font-serif text-2xl">Swipe a task</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Drag left on a row to reveal quick actions and delete. Pull a little further past delete for a stronger cue before you release.
            </p>
            <div className="relative overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-sm">
              <div className="flex h-12 items-stretch border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[10px] font-semibold text-[var(--text-tertiary)]">
                <span className="flex flex-1 items-center justify-center border-r border-[var(--border-default)]">Later</span>
                <span className="flex flex-1 items-center justify-center border-r border-[var(--border-default)]">Tomorrow</span>
                <span className="flex flex-1 items-center justify-center text-[var(--priority-high)]">Delete</span>
              </div>
              <div className="relative h-[52px] overflow-hidden">
                <div className="poco-onboard-swipe-card absolute inset-y-0 left-0 flex w-[88%] items-center gap-2 bg-[var(--bg-elevated)] px-3">
                  <span className="h-4 w-4 shrink-0 border border-[var(--border-default)] bg-[var(--bg-base)]" />
                  <span className="truncate text-sm font-medium text-[var(--text-primary)]">Sketch onboarding copy</span>
                </div>
              </div>
            </div>
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
            <h2 className="font-serif text-2xl">Focus ring</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Sessions use a simple ring: colour shifts with focus versus breaks so you can read the phase at a glance.
            </p>
            <div className="flex justify-center py-4">
              <svg viewBox="0 0 120 120" className="h-36 w-36 text-[var(--accent)]" aria-hidden>
                <circle cx="60" cy="60" r="44" stroke="var(--border-subtle)" strokeWidth="8" fill="none" />
                <circle
                  className="poco-onboard-ring-arc"
                  cx="60"
                  cy="60"
                  r="44"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="276"
                  strokeDashoffset="88"
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="66" textAnchor="middle" className="fill-[var(--text-primary)] font-serif text-xl">
                  25:00
                </text>
              </svg>
            </div>
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
            <h2 className="font-serif text-2xl">Look &amp; reading</h2>
            <p className="text-sm text-[var(--text-secondary)]">Choices apply live so you can see the page reflow.</p>
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Theme</p>
                <div className="flex flex-wrap gap-2">
                  {(['light', 'dark', 'shrouded'] as ThemeName[]).map((t) => (
                    <button key={t} type="button" onClick={() => setTheme(t)} className={chipClass(theme === t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Density</p>
                <div className="flex flex-wrap gap-2">
                  {(['compact', 'default', 'relaxed'] as DensityName[]).map((d) => (
                    <button key={d} type="button" onClick={() => setDensity(d)} className={chipClass(density === d)}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Text size</p>
                <div className="flex flex-wrap gap-2">
                  {(['sm', 'md', 'lg'] as FontScaleName[]).map((f) => (
                    <button key={f} type="button" onClick={() => setFontScale(f)} className={chipClass(fontScale === f)}>
                      {f}
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
                onClick={() => setStep(4)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h2 className="font-serif text-2xl">Motion &amp; safety</h2>
            <p className="text-sm text-[var(--text-secondary)]">Tune confirmations and device feedback to match how you work.</p>
            <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
              <label className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span>Reduce motion</span>
                <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3 py-2.5 text-sm">
                <span>Haptics</span>
                <input type="checkbox" checked={haptics} onChange={(e) => setHaptics(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3 py-2.5 text-sm">
                <span>Confirm before delete</span>
                <input type="checkbox" checked={confirmDelete} onChange={(e) => setConfirmDelete(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3 py-2.5 text-sm">
                <span>Keep screen awake in focus</span>
                <input type="checkbox" checked={keepScreenAwake} onChange={(e) => setKeepScreenAwake(e.target.checked)} />
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
            <h2 className="font-serif text-2xl">Timer &amp; sound</h2>
            <p className="text-sm text-[var(--text-secondary)]">Defaults for lengths, ambient loop, and automatic hand-offs.</p>
            <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Focus (minutes)</p>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_DURATIONS.map((m) => (
                    <button key={m} type="button" onClick={() => setFocusDurationMinutes(m)} className={chipClass(focusDurationMinutes === m)}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Short break</p>
                <div className="flex flex-wrap gap-2">
                  {SHORT_BREAKS.map((m) => (
                    <button key={m} type="button" onClick={() => setShortBreakMinutes(m)} className={chipClass(shortBreakMinutes === m)}>
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Long break</p>
                <div className="flex flex-wrap gap-2">
                  {LONG_BREAKS.map((m) => (
                    <button key={m} type="button" onClick={() => setLongBreakMinutes(m)} className={chipClass(longBreakMinutes === m)}>
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Ambient (during focus)</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['off', 'rain', 'white', 'forest', 'cafe'] as const).map((a) => (
                    <button key={a} type="button" onClick={() => setAmbientSound(a)} className={`${chipClass(ambientSound === a)} capitalize`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
                <label className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span>Auto-start breaks</span>
                  <input type="checkbox" checked={autoStartBreaks} onChange={(e) => setAutoStartBreaks(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-3 py-2.5 text-sm">
                  <span>Auto-start next focus</span>
                  <input type="checkbox" checked={autoStartNext} onChange={(e) => setAutoStartNext(e.target.checked)} />
                </label>
              </div>
            </div>
            <div className="mt-auto flex justify-between gap-3">
              <button type="button" className="poco-press text-sm font-semibold" onClick={() => setStep(4)}>
                Back
              </button>
              <button
                type="button"
                className="poco-press rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)]"
                onClick={() => setStep(6)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="animate-fadeIn flex flex-1 flex-col gap-6">
            <h2 className="font-serif text-2xl">Home &amp; profile</h2>
            <p className="text-sm text-[var(--text-secondary)]">Pick your default tab and how we greet you.</p>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Open app on</p>
              <div className="flex gap-2">
                {(['tasks', 'focus'] as LandingView[]).map((v) => (
                  <button key={v} type="button" onClick={() => setLanding(v)} className={`${chipClass(landing === v)} flex-1 capitalize`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Display name</label>
              <input
                className="poco-input w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-3 text-sm"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="mt-auto flex justify-between gap-3">
              <button type="button" className="poco-press text-sm font-semibold" onClick={() => setStep(5)}>
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
