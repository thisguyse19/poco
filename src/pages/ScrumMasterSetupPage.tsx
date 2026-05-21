import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore, SM_GATE_PROMPT_VERSION } from '../stores/settingsStore'
import type { ScrumMasterGender, ScrumMasterPersonality } from '../types'
import { PocoHourCarousel } from '../components/ui/PocoHourCarousel'
import { PocoMinuteCarousel } from '../components/ui/PocoMinuteCarousel'
import { PocoScrollPicker } from '../components/ui/PocoScrollPicker'
import { normalizeTimeHHMM, scrumNamesForGender } from '../utils/scrumMaster'
import { ScrumPersonalityPicker } from '../components/settings/ScrumPersonalityPicker'
import { requestScrumNotificationPermission } from '../hooks/useScrumNotifications'
import { notificationSettingsHint } from '../utils/notifyDelivery'
import { useSlayMaleVoiceSecret } from '../hooks/useSlayMaleVoiceSecret'

export function ScrumMasterSetupPage() {
  const navigate = useNavigate()
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const cur = useSettingsStore((s) => s.settings.scrumMaster)

  const [personality, setPersonality] = useState<ScrumMasterPersonality>(cur.personality ?? 'warm')
  const [smGender, setSmGender] = useState<ScrumMasterGender>(cur.gender)
  const [smName, setSmName] = useState(cur.name)
  const [smUp, setSmUp] = useState(cur.standUpTime)
  const [smDown, setSmDown] = useState(cur.standDownTime)
  const [sprintTitle, setSprintTitle] = useState(cur.sprintTitle ?? '')
  const [sprintGoal, setSprintGoal] = useState(cur.sprintGoal ?? '')

  const { unlocked: slayUnlocked, seg: maleSlaySeg, glow: maleSlayGlow, onMaleTap, resetProgress } = useSlayMaleVoiceSecret()

  const names = useMemo(() => [...scrumNamesForGender(smGender)], [smGender])

  const upHm = useMemo(() => {
    const [h, m] = normalizeTimeHHMM(smUp).split(':').map(Number)
    return { h, m }
  }, [smUp])
  const downHm = useMemo(() => {
    const [h, m] = normalizeTimeHHMM(smDown).split(':').map(Number)
    return { h, m }
  }, [smDown])

  const save = () => {
    const nm = [...scrumNamesForGender(smGender)]
    const merged = useSettingsStore.getState().settings.scrumMaster
    updateSettings({
      scrumMasterGateComplete: true,
      scrumMasterGatePromptVersion: SM_GATE_PROMPT_VERSION,
      scrumMaster: {
        ...merged,
        enabled: true,
        gender: smGender,
        name: nm.includes(smName) ? smName : nm[0],
        standUpTime: normalizeTimeHHMM(smUp),
        standDownTime: normalizeTimeHHMM(smDown),
        personality,
        sprintTitle: sprintTitle.trim(),
        sprintGoal: sprintGoal.trim(),
      },
    })
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="poco-content-max flex flex-1 flex-col px-4 py-10">
        <div className="animate-fadeIn flex flex-1 flex-col gap-5">
          <h1 className="font-serif text-3xl">Scrum Master setup</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Pick a tone, name, daily times, and an optional sprint box for the home screen. You can refine everything later
            in Settings → Features.
          </p>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Sprint (optional)</p>
            <input
              className="poco-input mb-2 w-full rounded-none border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm"
              placeholder="Sprint name"
              value={sprintTitle}
              onChange={(e) => setSprintTitle(e.target.value)}
            />
            <input
              className="poco-input mb-2 w-full rounded-none border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm"
              placeholder="Sprint goal: one line"
              value={sprintGoal}
              onChange={(e) => setSprintGoal(e.target.value)}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Personality</p>
            <ScrumPersonalityPicker compact value={personality} onChange={setPersonality} />
          </div>

          <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            {(['female', 'male'] as ScrumMasterGender[]).map((g) => (
              <button
                key={g}
                type="button"
                className={`poco-press flex h-11 min-h-[2.75rem] flex-1 flex-col items-center justify-center gap-0.5 border-r border-[var(--border-subtle)] px-2 py-1.5 text-xs font-semibold capitalize last:border-r-0 ${
                  smGender === g ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                } ${g === 'male' && maleSlayGlow ? 'poco-pride-male-tap-pulse' : ''} ${
                  g === 'male' && slayUnlocked ? 'poco-pride-male-voice-active' : ''
                }`}
                onClick={() => {
                  if (g === 'male') onMaleTap()
                  else resetProgress()
                  setSmGender(g)
                  const opts = scrumNamesForGender(g)
                  setSmName(opts.includes(smName) ? smName : opts[0])
                }}
              >
                <span className="capitalize">{g}</span>
                {g === 'male' && maleSlaySeg > 0 && !slayUnlocked ? (
                  <span className="flex w-full max-w-[4.5rem] gap-1 px-0.5" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded-none ${
                          i < maleSlaySeg ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'
                        } opacity-90 transition-colors duration-200`}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Name</p>
            <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1">
              <PocoScrollPicker
                prominent
                value={names.includes(smName) ? smName : names[0]}
                options={names}
                onChange={(n) => setSmName(n)}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Stand up</p>
            <div className="flex min-h-[84px] justify-center gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-2">
              <PocoHourCarousel variant="toolbar" hour0to23={upHm.h} onChange={(h) => setSmUp(normalizeTimeHHMM(`${h}:${upHm.m}`))} />
              <PocoMinuteCarousel variant="toolbar" minute0to55Step5={upHm.m} onChange={(m) => setSmUp(normalizeTimeHHMM(`${upHm.h}:${m}`))} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Stand down</p>
            <div className="flex min-h-[84px] justify-center gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-2">
              <PocoHourCarousel variant="toolbar" hour0to23={downHm.h} onChange={(h) => setSmDown(normalizeTimeHHMM(`${h}:${downHm.m}`))} />
              <PocoMinuteCarousel variant="toolbar" minute0to55Step5={downHm.m} onChange={(m) => setSmDown(normalizeTimeHHMM(`${downHm.h}:${m}`))} />
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-4">
            <button
              type="button"
              className="poco-press rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-subtle)] py-2.5 text-left text-sm font-semibold text-[var(--text-primary)]"
              onClick={() => void requestScrumNotificationPermission()}
            >
              <span className="block px-1">Notifications</span>
              <span className="mt-1 block px-1 text-xs font-normal text-[var(--text-secondary)]">
                {notificationSettingsHint()}
              </span>
            </button>
            <div className="flex justify-between gap-3">
              <button type="button" className="poco-press text-sm font-semibold text-[var(--text-secondary)]" onClick={() => navigate(-1)}>
                Back
              </button>
              <button
                type="button"
                className="poco-press rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)]"
                onClick={save}
              >
                Save and continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
