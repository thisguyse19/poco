import type { ScrumMasterSettings } from '../../types'
import { toLocalISODate } from '../../services/storage'

function daysUntilEnd(endIso: string | null | undefined): number | null {
  if (!endIso) return null
  const end = new Date(`${endIso}T12:00:00`)
  if (Number.isNaN(end.getTime())) return null
  const today = new Date(`${toLocalISODate()}T12:00:00`)
  return Math.ceil((end.getTime() - today.getTime()) / 86400000)
}

type Props = { sm: ScrumMasterSettings }

/** Lightweight sprint context for daily Scrum (optional fields). */
export function ScrumSprintStrip({ sm }: Props) {
  const title = sm.sprintTitle?.trim()
  const goal = sm.sprintGoal?.trim()
  if (!title && !goal) return null

  const d = daysUntilEnd(sm.sprintEndDate)
  const tail =
    d == null
      ? ''
      : d < 0
        ? ' · sprint window ended'
        : d === 0
          ? ' · sprint ends today'
          : d === 1
            ? ' · 1 day left in sprint'
            : ` · ${d} days left in sprint`

  return (
    <div className="mb-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-xs leading-snug text-[var(--text-secondary)]">
      {title ? (
        <p className="font-semibold text-[var(--text-primary)]">
          {title}
          {tail}
        </p>
      ) : null}
      {goal ? <p className={title ? 'mt-1' : ''}>Goal: {goal}</p> : null}
    </div>
  )
}
