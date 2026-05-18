import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../types'

const DURATION_MS = 5000

type Props = {
  task: Task | null
  onUndo: (task: Task) => void
  onDismiss: () => void
}

export function UndoDeleteToast({ task, onUndo, onDismiss }: Props) {
  const [progress, setProgress] = useState(1)
  const dismissed = useRef(false)

  useEffect(() => {
    dismissed.current = false
    if (!task) return
    const end = Date.now() + DURATION_MS
    const tick = () => {
      const left = Math.max(0, end - Date.now())
      setProgress(left / DURATION_MS)
      if (left <= 0 && !dismissed.current) {
        dismissed.current = true
        onDismiss()
      }
    }
    tick()
    const id = window.setInterval(tick, 80)
    return () => window.clearInterval(id)
  }, [task, onDismiss])

  if (!task || typeof document === 'undefined') return null

  const r = 10
  const c = 2 * Math.PI * r
  const dash = c * (1 - progress)

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-x-3 z-[130] max-md:bottom-[calc(var(--poco-mobile-nav-height)+0.75rem)] md:bottom-6 md:left-auto md:right-6 md:max-w-sm md:inset-x-auto"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-3 shadow-lg">
        <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0 text-[var(--accent)]" aria-hidden>
          <circle cx="14" cy="14" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
          <circle
            cx="14"
            cy="14"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={c}
            strokeDashoffset={dash}
            strokeLinecap="round"
            transform="rotate(-90 14 14)"
          />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Task deleted.</p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">{task.title}</p>
        </div>
        <button
          type="button"
          className="poco-press shrink-0 rounded-none border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--accent)]"
          onClick={() => {
            dismissed.current = true
            onUndo(task)
            onDismiss()
          }}
        >
          Undo
        </button>
      </div>
    </div>,
    document.body,
  )
}
