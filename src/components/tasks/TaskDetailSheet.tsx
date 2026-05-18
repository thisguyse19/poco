import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Priority, RecurrenceRule, ScheduledFor, Task } from '../../types'
import { formatTaskDueDisplay } from '../../utils/formatTaskDue'
import { triggerHaptic } from '../../utils/haptics'
import { useTaskStore } from '../../stores/taskStore'
import { useTimerStore } from '../../stores/timerStore'
import { Icon } from '../ui/Icon'
import { PocoBottomSheet } from '../ui/PocoBottomSheet'
import { PocoConfirmDialog } from '../ui/PocoConfirmDialog'
import { PocoDueDateTimeRow } from '../ui/PocoDateTimeCarousel'

type Draft = {
  title: string
  description: string
  notes: string
  category: string
  scheduledFor: ScheduledFor
  priority: Priority
  dueDate: string | null
  dueTime: string | null
  estimatedPomodoros: number
  recurrence: RecurrenceRule | null
  pinned: boolean
}

function taskToDraft(t: Task): Draft {
  return {
    title: t.title,
    description: t.description ?? '',
    notes: t.notes ?? '',
    category: t.category,
    scheduledFor: t.scheduledFor,
    priority: t.priority,
    dueDate: t.dueDate ?? null,
    dueTime: t.dueTime ?? null,
    estimatedPomodoros: t.estimatedPomodoros,
    recurrence: t.recurrence,
    pinned: t.pinned,
  }
}

function draftsEqual(a: Draft, b: Draft) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function buildPatch(orig: Task, d: Draft): Partial<Task> {
  const patch: Partial<Task> = {}
  if (d.title.trim() !== orig.title) patch.title = d.title.trim()
  if ((d.description || undefined) !== orig.description) patch.description = d.description.trim() || undefined
  if ((d.notes || undefined) !== orig.notes) patch.notes = d.notes.trim() || undefined
  if (d.category.trim() !== orig.category) patch.category = d.category.trim()
  if (d.scheduledFor !== orig.scheduledFor) patch.scheduledFor = d.scheduledFor
  if (d.priority !== orig.priority) patch.priority = d.priority
  if (d.dueDate !== orig.dueDate) patch.dueDate = d.dueDate
  if (d.dueTime !== orig.dueTime) patch.dueTime = d.dueTime
  if (d.estimatedPomodoros !== orig.estimatedPomodoros) patch.estimatedPomodoros = d.estimatedPomodoros
  if (JSON.stringify(d.recurrence) !== JSON.stringify(orig.recurrence)) patch.recurrence = d.recurrence
  if (d.pinned !== orig.pinned) patch.pinned = d.pinned
  return patch
}

export function TaskDetailSheet({
  task,
  onClose,
  onRequestDelete,
}: {
  task: Task
  onClose: () => void
  onRequestDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  const updateTask = useTaskStore((s) => s.updateTask)
  const setCurrentTask = useTimerStore((s) => s.setCurrentTask)
  const uid = useId()

  const [draft, setDraft] = useState(() => taskToDraft(task))
  const [baseline, setBaseline] = useState(() => taskToDraft(task))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [unsavedOpen, setUnsavedOpen] = useState(false)
  const exitDeletes = useRef(false)

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      const next = taskToDraft(task)
      setBaseline(next)
      setDraft(next)
    })
    return () => cancelAnimationFrame(id)
  }, [task.id])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetOpen(true))
    })
    return () => cancelAnimationFrame(id)
  }, [task.id])

  const dirty = !draftsEqual(draft, baseline)

  const performDiscardClose = useCallback(() => {
    setSheetOpen(false)
  }, [])

  const handleSheetExitComplete = useCallback(() => {
    if (exitDeletes.current) {
      exitDeletes.current = false
      onRequestDelete(task.id)
    } else {
      onClose()
    }
  }, [onClose, onRequestDelete, task.id])

  const attemptClose = useCallback(() => {
    if (dirty) setUnsavedOpen(true)
    else performDiscardClose()
  }, [dirty, performDiscardClose])

  const saveAndClose = useCallback(() => {
    const title = draft.title.trim()
    if (!title) {
      triggerHaptic([30, 20, 30])
      return
    }
    const nextDraft = { ...draft, title }
    const patch = buildPatch(task, nextDraft)
    if (Object.keys(patch).length > 0) {
      updateTask(task.id, patch)
    }
    setBaseline(nextDraft)
    setUnsavedOpen(false)
    performDiscardClose()
  }, [draft, performDiscardClose, task, updateTask])

  return (
    <>
      <PocoBottomSheet
        open={sheetOpen}
        onBackdropClick={attemptClose}
        onExitComplete={handleSheetExitComplete}
        sheetClassName="max-md:rounded-none md:rounded-[var(--radius-lg)]"
      >
        <div className="grid grid-cols-3 items-center gap-2 border-b border-[var(--border-subtle)] px-3 pb-3">
          <button
            type="button"
            className="poco-press justify-self-start text-sm font-semibold text-[var(--text-secondary)]"
            onClick={attemptClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="poco-press justify-self-center text-sm font-semibold text-[var(--accent)]"
            onClick={saveAndClose}
          >
            Done
          </button>
          <div className="justify-self-end">
            {!task.completed ? (
              <button
                type="button"
                className="poco-press flex items-center gap-1 text-sm font-semibold text-[var(--accent)]"
                onClick={() => {
                  const title = draft.title.trim()
                  if (!title) {
                    triggerHaptic([30, 20, 30])
                    return
                  }
                  const patch = buildPatch(task, { ...draft, title })
                  if (Object.keys(patch).length > 0) updateTask(task.id, patch)
                  setCurrentTask(task.id)
                  setUnsavedOpen(false)
                  performDiscardClose()
                  navigate('/focus')
                }}
              >
                <Icon name="focus" size={16} />
                Focus
              </button>
            ) : (
              <span className="w-8" />
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-6">
          <h2 id={`${uid}-title`} className="sr-only">
            Task details
          </h2>
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Title</label>
          <input
            className="poco-input mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-3 text-base font-medium"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">When</p>
          <div className="flex min-h-10 gap-1.5">
            {(['inbox', 'today', 'tomorrow', 'someday'] as ScheduledFor[]).map((h) => (
              <button
                key={h}
                type="button"
                className={`poco-press flex min-h-9 flex-1 items-center justify-center rounded-[var(--radius-sm)] border text-[11px] font-semibold capitalize ${
                  draft.scheduledFor === h
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)]'
                }`}
                onClick={() => setDraft((d) => ({ ...d, scheduledFor: h }))}
              >
                {h}
              </button>
            ))}
          </div>

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Priority</p>
          <div className="flex min-h-10 gap-1.5">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`poco-press flex min-h-9 flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] border text-[11px] font-semibold capitalize ${
                  draft.priority === p
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)]'
                }`}
                onClick={() => setDraft((d) => ({ ...d, priority: p }))}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Due</span>
            {draft.dueDate || draft.dueTime ? (
              <span className="text-xs text-[var(--text-secondary)]">{formatTaskDueDisplay(draft.dueDate, draft.dueTime)}</span>
            ) : (
              <span className="text-xs text-[var(--text-tertiary)]">None</span>
            )}
          </div>
          <div className="mt-2">
            <PocoDueDateTimeRow
              dueDate={draft.dueDate}
              dueTime={draft.dueTime}
              onChange={({ dueDate, dueTime }) => setDraft((d) => ({ ...d, dueDate, dueTime }))}
            />
          </div>
          {(draft.dueDate || draft.dueTime) && (
            <button
              type="button"
              className="poco-press mt-2 text-xs font-semibold text-[var(--priority-high)]"
              onClick={() => setDraft((d) => ({ ...d, dueDate: null, dueTime: null }))}
            >
              Clear due
            </button>
          )}

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Repeat</p>
          <div className="flex min-h-10 w-full gap-1.5">
            {[
              { label: 'None', rule: null },
              { label: 'Daily', rule: { label: 'Daily', intervalDays: 1 } },
              { label: 'Weekly', rule: { label: 'Weekly', intervalDays: 7 } },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`poco-press flex min-h-9 flex-1 items-center justify-center rounded-[var(--radius-sm)] border text-[11px] font-semibold ${
                  JSON.stringify(draft.recurrence) === JSON.stringify(opt.rule)
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)]'
                }`}
                onClick={() => setDraft((d) => ({ ...d, recurrence: opt.rule }))}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Description
          </label>
          <input
            className="poco-input w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />

          <label className="mb-1 mt-3 block text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Notes</label>
          <textarea
            className="poco-input w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            rows={3}
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Category</label>
              <input
                className="poco-input mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Est. pomodoros</label>
              <input
                type="number"
                min={0}
                className="poco-input mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                value={draft.estimatedPomodoros}
                onChange={(e) => setDraft((d) => ({ ...d, estimatedPomodoros: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <label className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-3 text-sm">
            <span>Pinned</span>
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.checked }))}
            />
          </label>

          <button
            type="button"
            className="poco-press mt-6 w-full rounded-[var(--radius-sm)] border border-[var(--priority-high)]/40 py-3 text-sm font-semibold text-[var(--priority-high)]"
            onClick={() => {
              exitDeletes.current = true
              setSheetOpen(false)
            }}
          >
            Delete task
          </button>
        </div>
      </PocoBottomSheet>

      <PocoConfirmDialog
        open={unsavedOpen}
        title="Discard changes?"
        description="You have unsaved edits for this task."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        variant="danger"
        onCancel={() => setUnsavedOpen(false)}
        onConfirm={() => {
          setUnsavedOpen(false)
          performDiscardClose()
        }}
      />
    </>
  )
}
