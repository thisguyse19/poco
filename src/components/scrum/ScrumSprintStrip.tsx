import type { ScrumMasterSettings } from '../../types'

type Props = { sm: ScrumMasterSettings }

/** Lightweight sprint context for daily Scrum (optional fields). */
export function ScrumSprintStrip({ sm }: Props) {
  const title = sm.sprintTitle?.trim()
  const goal = sm.sprintGoal?.trim()
  if (!title && !goal) return null

  return (
    <div className="mb-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-xs leading-snug text-[var(--text-secondary)]">
      {title ? <p className="font-semibold text-[var(--text-primary)]">{title}</p> : null}
      {goal ? <p className={title ? 'mt-1' : ''}>Goal: {goal}</p> : null}
    </div>
  )
}
