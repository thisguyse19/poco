import { useMemo, useState } from 'react'
import { Icon } from '../ui/Icon'
import { parseQuickAdd } from '../../utils/nlp'
import { useTaskStore } from '../../stores/taskStore'
import { triggerHaptic } from '../../utils/haptics'

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
    <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-3 md:px-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="poco-press flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-3 text-left text-sm text-[var(--text-secondary)]"
        >
          <Icon name="plus" size={18} />
          Quick add a task…
        </button>
      ) : (
        <div className="animate-searchExpand overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2">
          <div className="flex items-start gap-2">
            <textarea
              className="poco-input min-h-[3rem] flex-1 resize-none rounded-[var(--radius-sm)] border border-transparent bg-transparent px-2 py-2 text-sm outline-none"
              placeholder="Try: Report @Work tomorrow 9am"
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
              className="poco-press mt-1 rounded-[var(--radius-sm)] bg-[var(--accent)] p-2 text-[var(--text-inverse)]"
              aria-label="Add task"
              onClick={submit}
            >
              <Icon name="check" size={18} />
            </button>
            <button
              type="button"
              className="poco-press mt-1 p-2 text-[var(--text-tertiary)]"
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
            <div className="mt-2 flex flex-wrap gap-2">
              {parsed.chips.map((c, i) => (
                <span
                  key={`${c.label}-${i}`}
                  className="rounded-full border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                >
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
