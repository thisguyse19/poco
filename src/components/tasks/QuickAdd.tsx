import { useMemo, useState } from 'react'
import { Icon } from '../ui/Icon'
import { parseQuickAdd, type NlpPreviewChip } from '../../utils/nlp'
import { useTaskStore } from '../../stores/taskStore'
import { triggerHaptic } from '../../utils/haptics'

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
      return 'pin' as const
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

export function QuickAdd() {
  const addTask = useTaskStore((s) => s.addTask)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const parsed = useMemo(() => parseQuickAdd(text), [text])

  const submit = () => {
    const p = parseQuickAdd(text)
    if (!p.title.trim()) return
    addTask({
      title: p.title,
      category: p.category,
      dueDate: p.dueDate ?? null,
      dueTime: p.dueTime ?? null,
      scheduledFor: p.scheduledFor ?? 'today',
      priority: p.priority ?? 'medium',
    })
    triggerHaptic(10)
    setText('')
    setOpen(false)
  }

  return (
    <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-2 md:px-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="poco-press flex w-full items-center gap-2 rounded-none border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] transition-opacity duration-300 [transition-timing-function:var(--ease-ios)]"
        >
          <Icon name="plus" size={18} />
          add a task
        </button>
      ) : (
        <div className="poco-quickadd-open rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2 shadow-sm">
          <div className="flex items-start gap-2">
            <textarea
              className="poco-input min-h-[2.75rem] flex-1 resize-none rounded-none border-0 bg-transparent px-2 py-2 text-sm outline-none"
              placeholder="add a task"
              value={text}
              rows={2}
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
              className="poco-press mt-0.5 rounded-none bg-[var(--accent)] p-2 text-[var(--text-inverse)]"
              aria-label="Add task"
              onClick={submit}
            >
              <Icon name="check" size={18} />
            </button>
            <button
              type="button"
              className="poco-press mt-0.5 p-2 text-[var(--text-tertiary)]"
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parsed.chips.map((c, i) => (
                <span
                  key={`${c.label}-${i}`}
                  className={`flex items-center gap-1 rounded-none border px-2 py-1 text-xs font-semibold ${chipStyles(c.kind)}`}
                >
                  <Icon name={chipIcon(c.kind)} size={14} className="shrink-0 opacity-90" />
                  {c.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
