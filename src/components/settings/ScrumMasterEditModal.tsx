import { useEffect, useMemo, useState } from 'react'
import type { ScrumMasterGender, ScrumMasterSettings } from '../../types'
import { PocoAnimatedCenterModal } from '../ui/PocoAnimatedCenterModal'
import { PocoHourCarousel } from '../ui/PocoHourCarousel'
import { PocoMinuteCarousel } from '../ui/PocoMinuteCarousel'
import { PocoScrollPicker } from '../ui/PocoScrollPicker'
import { normalizeTimeHHMM, scrumNamesForGender, SCRUM_MASTER_PERSONALITIES } from '../../utils/scrumMaster'

const triBase =
  'poco-press flex h-11 min-h-[2.75rem] flex-1 flex-row items-center justify-center gap-2 px-2 text-xs font-semibold capitalize transition-colors duration-200 [transition-timing-function:var(--ease-ios)]'

function parseHm(hhmm: string): { h: number; m: number } {
  const [a, b] = normalizeTimeHHMM(hhmm).split(':').map(Number)
  return { h: a, m: b }
}

type Props = {
  open: boolean
  onClose: () => void
  value: ScrumMasterSettings
  onSave: (next: ScrumMasterSettings) => void
}

export function ScrumMasterEditModal({ open, onClose, value, onSave }: Props) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      setDraft(value)
    })
    return () => cancelAnimationFrame(id)
  }, [open, value])

  const up = useMemo(() => parseHm(draft.standUpTime), [draft.standUpTime])
  const down = useMemo(() => parseHm(draft.standDownTime), [draft.standDownTime])

  const names = useMemo(() => [...scrumNamesForGender(draft.gender)], [draft.gender])

  return (
    <PocoAnimatedCenterModal open={open} onBackdropClick={onClose}>
      <div className="mx-4 max-h-[min(88dvh,640px)] w-full max-w-md overflow-y-auto rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-xl">
        <h2 className="font-serif text-xl">Scrum Master</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Daily stand-up and stand-down prompts stay local on this device.</p>

        <label className="mt-4 flex items-center justify-between gap-3 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-3 text-sm">
          <span>Enable Scrum Master</span>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
          />
        </label>

        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Personality</p>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SCRUM_MASTER_PERSONALITIES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, personality: p.id }))}
              className={`poco-press min-w-[8.5rem] shrink-0 rounded-none border px-2.5 py-2 text-left ${
                draft.personality === p.id
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-base)]'
              }`}
            >
              <span className="block text-xs font-semibold text-[var(--text-primary)]">{p.title}</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-[var(--text-secondary)]">{p.hint}</span>
            </button>
          ))}
        </div>

        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Voice</p>
        <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          {(['female', 'male'] as ScrumMasterGender[]).map((g) => (
            <button
              key={g}
              type="button"
              className={`${triBase} border-r border-[var(--border-subtle)] last:border-r-0 ${
                draft.gender === g ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'
              }`}
              onClick={() =>
                setDraft((d) => {
                  const opts = scrumNamesForGender(g)
                  const nextName = opts.includes(d.name) ? d.name : opts[0]
                  return { ...d, gender: g, name: nextName }
                })
              }
            >
              {g}
            </button>
          ))}
        </div>

        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Name</p>
        <div className="rounded-none border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1">
          <PocoScrollPicker
            prominent
            value={names.includes(draft.name) ? draft.name : names[0]}
            options={names}
            onChange={(n) => setDraft((d) => ({ ...d, name: n }))}
          />
        </div>

        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Daily stand up</p>
        <div className="flex min-h-[72px] items-stretch justify-center gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-2">
          <PocoHourCarousel variant="toolbar" hour0to23={up.h} onChange={(h) => setDraft((d) => ({ ...d, standUpTime: normalizeTimeHHMM(`${h}:${up.m}`) }))} />
          <PocoMinuteCarousel variant="toolbar" minute0to55Step5={up.m} onChange={(m) => setDraft((d) => ({ ...d, standUpTime: normalizeTimeHHMM(`${up.h}:${m}`) }))} />
        </div>

        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Daily stand down</p>
        <div className="flex min-h-[72px] items-stretch justify-center gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-2">
          <PocoHourCarousel variant="toolbar" hour0to23={down.h} onChange={(h) => setDraft((d) => ({ ...d, standDownTime: normalizeTimeHHMM(`${h}:${down.m}`) }))} />
          <PocoMinuteCarousel variant="toolbar" minute0to55Step5={down.m} onChange={(m) => setDraft((d) => ({ ...d, standDownTime: normalizeTimeHHMM(`${down.h}:${m}`) }))} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="poco-press px-3 py-2 text-sm font-semibold text-[var(--text-secondary)]" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="poco-press rounded-none bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)]"
            onClick={() => {
              onSave({
                ...draft,
                standUpTime: normalizeTimeHHMM(draft.standUpTime),
                standDownTime: normalizeTimeHHMM(draft.standDownTime),
              })
              onClose()
            }}
          >
            Save
          </button>
        </div>
      </div>
    </PocoAnimatedCenterModal>
  )
}
