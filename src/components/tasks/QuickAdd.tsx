import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { parseQuickAdd, type NlpPreviewChip } from '../../utils/nlp'
import { formatNlpDateChipDisplay } from '../../utils/formatNlpChip'
import { useTaskStore } from '../../stores/taskStore'
import { triggerHaptic } from '../../utils/haptics'
import { pocoDevLab } from '../../utils/pocoDevLab'

function chipStyles(kind: NlpPreviewChip['kind']) {
  switch (kind) {
    case 'category':
      return 'border-[var(--pin-color)]/60 bg-[var(--bg-subtle)] text-[var(--pin-color)]'
    case 'date':
      return 'border-[var(--accent)]/60 bg-[var(--accent-soft)] text-[var(--accent)]'
    case 'time':
      return 'border-[var(--priority-medium)]/60 bg-[var(--bg-subtle)] text-[var(--priority-medium)]'
    case 'priority':
      return 'border-[var(--priority-high)]/50 bg-[var(--bg-subtle)] text-[var(--priority-high)]'
    default:
      return 'border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
  }
}

function chipIcon(kind: NlpPreviewChip['kind']) {
  switch (kind) {
    case 'category':
      return 'tag' as const
    case 'date':
      return 'calendar' as const
    case 'time':
      return 'timer' as const
    case 'priority':
      return 'flag' as const
    default:
      return 'tasks' as const
  }
}

const PLACEHOLDER = 'Try "Send an email for @work tomorrow"'

type QuickAddProps = {
  /** Force new tasks into this category (e.g. Scrum Master stand-up) */
  categoryLock?: string | null
  placeholderOverride?: string
  /** Scrum stand-up / stand-down visual on the field */
  scrumGlow?: boolean
  showEndScrum?: boolean
  endScrumLabel?: string
  onEndScrum?: () => void
}

function chipLabel(c: NlpPreviewChip, parsed: ReturnType<typeof parseQuickAdd>): string {
  if (c.kind === 'date') return formatNlpDateChipDisplay(c.label, parsed.dueDate)
  return c.label
}

export function QuickAdd({
  categoryLock = null,
  placeholderOverride,
  scrumGlow = false,
  showEndScrum = false,
  endScrumLabel = 'End',
  onEndScrum,
}: QuickAddProps = {}) {
  const addTask = useTaskStore((s) => s.addTask)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const parsed = useMemo(() => parseQuickAdd(text), [text])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  const submit = () => {
    const p = parseQuickAdd(text)
    if (!p.title.trim()) return
    let title = p.title.trim()
    if (pocoDevLab.get().stressSeedActive) {
      title = `[sim] ${title}`
    }
    const cat = categoryLock ?? p.category
    addTask({
      title,
      category: cat,
      dueDate: p.dueDate ?? null,
      dueTime: p.dueTime ?? null,
      scheduledFor: p.scheduledFor ?? 'today',
      priority: p.priority ?? 'medium',
    })
    triggerHaptic(10)
    setText('')
    // Keep quick-add open so iOS can chain adds without re-tapping the field.
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const ph = placeholderOverride ?? PLACEHOLDER

  return (
    <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-2 md:px-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="poco-press flex h-[2.75rem] w-full items-center gap-2 rounded-none border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-left text-sm text-[var(--text-secondary)] transition-opacity duration-300 [transition-timing-function:var(--ease-ios)]"
        >
          <Icon name="plus" size={18} />
          <span className="min-w-0 truncate">{ph}</span>
        </button>
      ) : (
        <div
          className={`poco-quickadd-open rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-0 shadow-sm ${
            scrumGlow ? 'poco-scrum-glow-border poco-scrum-placeholder-glow' : ''
          }`}
        >
          <div className="flex h-[2.75rem] items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--accent)]" aria-hidden>
              <Icon name="plus" size={18} />
            </span>
            <textarea
              ref={inputRef}
              className={`poco-input max-h-[2.75rem] min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-1 py-1 text-sm leading-snug outline-none ${
                scrumGlow ? 'poco-scrum-input-inner-glow' : ''
              }`}
              placeholder={ph}
              value={text}
              rows={1}
              enterKeyHint="done"
              inputMode="text"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              autoFocus
            />
            <button
              type="button"
              className="poco-press shrink-0 rounded-none bg-[var(--accent)] p-2 text-[var(--text-inverse)]"
              aria-label="Add task"
              onClick={submit}
            >
              <Icon name="check" size={18} />
            </button>
            <button
              type="button"
              className="poco-press shrink-0 p-2 text-[var(--text-tertiary)]"
              aria-label="Close"
              onClick={() => {
                setOpen(false)
                setText('')
              }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          {parsed.chips.length > 0 ? (
            <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto border-t border-[var(--border-subtle)] px-0 py-2">
              {parsed.chips.map((c, i) => (
                <span
                  key={`${c.label}-${i}`}
                  className={`flex items-center gap-1 rounded-none border px-2 py-1 text-xs font-semibold ${chipStyles(c.kind)}`}
                >
                  <Icon name={chipIcon(c.kind)} size={14} className="shrink-0 opacity-90" />
                  {chipLabel(c, parsed)}
                </span>
              ))}
            </div>
          ) : null}
          {showEndScrum && onEndScrum ? (
            <div className="border-t border-[var(--border-subtle)] px-0 py-2">
              <button
                type="button"
                className="poco-press w-full rounded-none border border-[var(--border-default)] bg-[var(--bg-subtle)] py-2 text-xs font-semibold text-[var(--text-primary)]"
                onClick={onEndScrum}
              >
                {endScrumLabel}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
