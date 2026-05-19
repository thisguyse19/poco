import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import type { DensityName, FontScaleName, ThemeName } from '../types'
import { AppearanceControlGroup } from '../components/settings/AppearanceControlGroup'

const STEP_COUNT = 4

export function OnboardingPage() {
  const navigate = useNavigate()
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const base = useMemo(() => useSettingsStore.getState().settings, [])

  const [step, setStep] = useState(0)
  const [theme, setTheme] = useState<ThemeName>(base.theme)
  const [density, setDensity] = useState<DensityName>(base.density)
  const [fontScale, setFontScale] = useState<FontScaleName>(base.fontScale)

  const [profileName, setProfileName] = useState(base.profileName.trim() || '')

  useEffect(() => {
    updateSettings({ theme, density, fontScale })
  }, [theme, density, fontScale, updateSettings])

  const skipFromStart = () => {
    updateSettings({ onboardingComplete: true, scrumMasterGateComplete: false })
    navigate('/')
  }

  const finish = () => {
    const name = profileName.trim() || 'You'
    updateSettings({
      onboardingComplete: true,
      scrumMasterGateComplete: false,
      profileName: name,
      theme,
      density,
      fontScale,
    })
    navigate('/')
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
              A quiet place for tasks and focus. We will show two tiny motion hints, tune how poco looks, then add your
              name. After that, you can choose whether to enable the Scrum Master in a quick follow-up.
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
            <h2 className="font-serif text-2xl">Tasks &amp; focus</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Swipe tasks for quick moves, and let the focus ring mark your deep work.
            </p>
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-sm">
                <div className="flex h-10 items-stretch border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[10px] font-semibold text-[var(--text-tertiary)]">
                  <span className="flex flex-1 items-center justify-center border-r border-[var(--border-default)]">Later</span>
                  <span className="flex flex-1 items-center justify-center border-r border-[var(--border-default)]">Tomorrow</span>
                  <span className="flex flex-1 items-center justify-center text-[var(--priority-high)]">Delete</span>
                </div>
                <div className="relative h-[52px] overflow-hidden">
                  <div className="poco-onboard-swipe-card absolute inset-y-0 left-0 flex w-[88%] items-center gap-2 bg-[var(--bg-elevated)] px-3">
                    <span className="h-4 w-4 shrink-0 border border-[var(--border-default)] bg-[var(--bg-base)]" />
                    <span className="truncate text-sm font-medium">Swipe a row like this</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center py-2">
                <svg viewBox="0 0 120 120" className="h-28 w-28 text-[var(--accent)]" aria-hidden>
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
                </svg>
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
            <h2 className="font-serif text-2xl">Appearance</h2>
            <p className="text-sm text-[var(--text-secondary)]">Same controls as Settings — changes apply as you tap.</p>
            <AppearanceControlGroup
              theme={theme}
              density={density}
              fontScale={fontScale}
              onChange={(p) => {
                if (p.theme) setTheme(p.theme)
                if (p.density) setDensity(p.density)
                if (p.fontScale) setFontScale(p.fontScale)
              }}
            />
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
            <h2 className="font-serif text-2xl">Almost there</h2>
            <p className="text-sm text-[var(--text-secondary)]">How should we greet you on the home screen?</p>
            <input
              className="poco-input w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-3 text-sm"
              placeholder="Your name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
            <div className="mt-auto flex justify-between gap-3">
              <button type="button" className="poco-press text-sm font-semibold" onClick={() => setStep(2)}>
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
