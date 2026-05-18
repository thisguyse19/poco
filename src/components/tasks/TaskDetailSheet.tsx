import { createPortal } from 'react-dom'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Priority, RecurrenceRule, ScheduledFor, Task } from '../../types'
import { toLocalISODate } from '../../services/storage'
import { formatTaskDueDisplay } from '../../utils/formatTaskDue'
import { triggerHaptic } from '../../utils/haptics'
import { useTaskStore } from '../../stores/taskStore'
import { useTimerStore } from '../../stores/timerStore'
import { Icon } from '../ui/Icon'
import { PocoScrollPicker } from '../ui/PocoScrollPicker'
import { PocoConfirmDialog } from '../ui/PocoConfirmDialog'

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
  open,
  onClose,
  onRequestDelete,
}: {
  task: Task
  open: boolean
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
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef(0)
  const [unsavedOpen, setUnsavedOpen] = useState(false)

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      const next = taskToDraft(task)
      setBaseline(next)
      setDraft(next)
    })
    return () => cancelAnimationFrame(id)
  }, [task.id])

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setSheetOpen(true))
      return () => cancelAnimationFrame(id)
    }
    queueMicrotask(() => {
      setSheetOpen(false)
      setDragY(0)
    })
  }, [open])

  const dirty = !draftsEqual(draft, baseline)

  const performDiscardClose = useCallback(() => {
    setSheetOpen(false)
    window.setTimeout(onClose, 280)
  }, [onClose])

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

  if (!open) return null

  const reduceMotion = document.documentElement.dataset.reduceMotion === 'true'
  const yTransform = sheetOpen ? `translateY(${dragY}px)` : 'translateY(100%)'

  const y = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => String(y - 2 + i))
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const [dy, dm, dd] = (draft.dueDate ?? toLocalISODate()).split('-').map((x) => x.padStart(2, '0'))
  const dim = new Date(Number(dy), Number(dm), 0).getDate()
  const days = Array.from({ length: dim }, (_, i) => String(i + 1).padStart(2, '0'))

  const monthLabel = (m: string) =>
    new Date(2000, Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short' })

  return createPortal(
    <>
      <div
        className={`fixed left-0 right-0 top-0 z-30 max-md:bottom-[var(--poco-mobile-nav-height)] md:bottom-0 md:inset-0 md:z-[100] bg-black/30 backdrop-blur-[1px] transition-opacity ${
          reduceMotion ? 'duration-0' : 'duration-[280ms]'
        } ${sheetOpen ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden
        onClick={attemptClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[31] mx-auto flex max-h-[90dvh] max-w-lg flex-col rounded-t-[var(--radius-lg)] border border-b-0 border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-xl transition-transform ${
          reduceMotion ? 'duration-0' : 'duration-200'
        } max-md:pb-[calc(var(--poco-mobile-nav-height)+0.75rem)] md:rounded-[var(--radius-lg)] md:border-b`}
        style={{ transform: yTransform }}
        role="dialog"
        aria-labelledby={`${uid}-title`}
      >
        <div
          className="flex cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            dragStart.current = e.clientY
            setDragY(0)
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
            const d = e.clientY - dragStart.current
            if (d > 0) setDragY(d)
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId)
            }
            if (dragY > 72) attemptClose()
            setDragY(0)
          }}
        >
          <span className="h-1 w-10 rounded-full bg-[var(--border-default)]" />
        </div>

        <div className="grid grid-cols-3 items-center gap-2 border-b border-[var(--border-subtle)] px-3 pb-3">
          <button type="button" className="poco-press justify-self-start text-sm font-semibold text-[var(--text-secondary)]" onClick={attemptClose}>
            Cancel
          </button>
          <button type="button" className="poco-press justify-self-center text-sm font-semibold text-[var(--accent)]" onClick={saveAndClose}>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Due</span>
            {draft.dueDate || draft.dueTime ? (
              <span className="text-xs text-[var(--text-secondary)]">{formatTaskDueDisplay(draft.dueDate, draft.dueTime)}</span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {!draft.dueDate ? (
              <button
                type="button"
                className="poco-press rounded-[var(--radius-sm)] border border-dashed border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                onClick={() => setDraft((d) => ({ ...d, dueDate: toLocalISODate() }))}
              >
                Add date
              </button>
            ) : (
              <div className="flex w-full gap-2">
                <PocoScrollPicker
                  value={dy}
                  options={years}
                  onChange={(v) => {
                    const dim2 = new Date(Number(v), Number(dm) - 1, 0).getDate()
                    const day = Math.min(Number(dd), dim2)
                    setDraft((d) => ({ ...d, dueDate: `${v}-${dm}-${String(day).padStart(2, '0')}` }))
                  }}
                />
                <PocoScrollPicker value={dm} options={months} onChange={(v) => {
                    const dim2 = new Date(Number(dy), Number(v) - 1, 0).getDate()
                    const day = Math.min(Number(dd), dim2)
                    setDraft((d) => ({ ...d, dueDate: `${dy}-${v}-${String(day).padStart(2, '0')}` }))
                  }} format={monthLabel} />
                <PocoScrollPicker
                  value={dd}
                  options={days}
                  onChange={(v) => setDraft((d) => ({ ...d, dueDate: `${dy}-${dm}-${v}` }))}
                  format={(x) => String(Number(x))}
                />
              </div>
            )}
            {draft.dueDate && !draft.dueTime ? (
              <button
                type="button"
                className="poco-press mt-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                onClick={() => setDraft((d) => ({ ...d, dueTime: '09:00' }))}
              >
                Add time (09:00)
              </button>
            ) : null}
            {draft.dueDate && draft.dueTime ? (
              <div className="mt-2 flex w-full items-center gap-1">
                <PocoScrollPicker
                  value={draft.dueTime.split(':')[0] ?? '09'}
                  options={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))}
                  onChange={(h) => {
                    const m = draft.dueTime?.split(':')[1] ?? '00'
                    setDraft((d) => ({ ...d, dueTime: `${h}:${m}` }))
                  }}
                />
                <span className="pt-6 text-lg font-semibold">:</span>
                <PocoScrollPicker
                  value={draft.dueTime.split(':')[1] ?? '00'}
                  options={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))}
                  onChange={(m) => {
                    const h = draft.dueTime?.split(':')[0] ?? '09'
                    setDraft((d) => ({ ...d, dueTime: `${h}:${m}` }))
                  }}
                />
              </div>
            ) : null}
            {(draft.dueDate || draft.dueTime) && (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-[var(--priority-high)]"
                onClick={() => setDraft((d) => ({ ...d, dueDate: null, dueTime: null }))}
              >
                Clear due
              </button>
            )}
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

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Repeat</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'None', rule: null },
              { label: 'Daily', rule: { label: 'Daily', intervalDays: 1 } },
              { label: 'Weekly', rule: { label: 'Weekly', intervalDays: 7 } },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`poco-press rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-semibold ${
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
            onClick={() => onRequestDelete(task.id)}
          >
            Delete task
          </button>
        </div>
      </div>

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
    </>,
    document.body,
  )
}
