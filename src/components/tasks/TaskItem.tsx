import { useCallback, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Priority, ScheduledFor, Task } from '../../types'
import { formatTaskDueDisplay } from '../../utils/formatTaskDue'
import { triggerHaptic } from '../../utils/haptics'
import { Icon } from '../ui/Icon'
import { useTaskStore } from '../../stores/taskStore'
import { useTimerStore } from '../../stores/timerStore'

import { pocoDevLab } from '../../utils/pocoDevLab'

const W_LATER = 100
const W_TOM = 100
const W_DEL = 82
const DIV = 2
/** Total width of swipe tray (px) */
const SWIPE_BASE = W_LATER + DIV + W_TOM + DIV + W_DEL

function rubber(extra: number) {
  if (extra <= 0) return 0
  return Math.min(52, extra * 0.48 + (extra * extra) / 200)
}

function txClosed(delta: number) {
  let t = Math.min(0, delta)
  if (t < -SWIPE_BASE) {
    const over = -t - SWIPE_BASE
    t = -(SWIPE_BASE + rubber(over))
  }
  return t
}

function txOpenDrag(delta: number) {
  let t = -SWIPE_BASE + delta
  if (t > 0) t = 0
  if (t < -SWIPE_BASE) {
    const over = -t - SWIPE_BASE
    t = -(SWIPE_BASE + rubber(over))
  }
  return t
}

const toolBtn =
  'poco-press flex h-9 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-0 bg-[var(--bg-subtle)] px-1 py-1 text-[var(--text-secondary)] transition-colors duration-200 [transition-timing-function:var(--ease-ios)] active:bg-[var(--accent-soft)] active:text-[var(--accent)]'

const priBg: Record<Priority, string> = {
  low: 'bg-[var(--priority-low)]',
  medium: 'bg-[var(--priority-medium)]',
  high: 'bg-[var(--priority-high)]',
}

function priorityDot(p: Priority) {
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-none ${priBg[p]}`} aria-hidden />
}

function scheduleChip(s: ScheduledFor) {
  const label =
    s === 'inbox' ? 'Inbox' : s === 'today' ? 'Today' : s === 'tomorrow' ? 'Tomorrow' : 'Someday'
  const cls =
    s === 'today'
      ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]'
      : s === 'tomorrow'
        ? 'border-[var(--priority-low)]/50 bg-[var(--bg-subtle)] text-[var(--priority-low)]'
        : s === 'inbox'
          ? 'border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
          : 'border-[var(--pin-color)]/50 bg-[var(--bg-subtle)] text-[var(--pin-color)]'
  return (
    <span
      className={`rounded-none border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  )
}

type Flow = 'when' | 'priority' | null

export function TaskItem({
  task,
  onOpenDetail,
  onRequestDelete,
  swipeOpenId,
  onSwipeOpenChange,
}: {
  task: Task
  onOpenDetail: (t: Task) => void
  onRequestDelete: (id: string) => void
  swipeOpenId: string | null
  onSwipeOpenChange: (id: string | null) => void
}) {
  const navigate = useNavigate()
  const updateTask = useTaskStore((s) => s.updateTask)
  const toggleComplete = useTaskStore((s) => s.toggleComplete)
  const pinTask = useTaskStore((s) => s.pinTask)
  const unpinTask = useTaskStore((s) => s.unpinTask)
  const rescheduleLaterToday = useTaskStore((s) => s.rescheduleLaterToday)
  const rescheduleTomorrow = useTaskStore((s) => s.rescheduleTomorrow)
  const setCurrentTask = useTimerStore((s) => s.setCurrentTask)

  const showTaskIds = useSyncExternalStore(
    (cb) => pocoDevLab.subscribe(() => cb()),
    () => pocoDevLab.get().showTaskIds,
    () => false,
  )

  const [optionsOpen, setOptionsOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [flowPanel, setFlowPanel] = useState<Flow>(null)
  const [dragDelta, setDragDelta] = useState(0)
  const [dragOriginOpen, setDragOriginOpen] = useState(false)
  const startX = useRef(0)
  const dragDeltaRef = useRef(0)
  const maxOvershootRef = useRef(0)
  const suppressNextClick = useRef(false)
  const [justCompleted, setJustCompleted] = useState(false)

  const rowSwipeOpen = swipeOpenId === task.id

  const closeSwipe = useCallback(() => {
    if (swipeOpenId === task.id) onSwipeOpenChange(null)
  }, [onSwipeOpenChange, swipeOpenId, task.id])

  const openSwipe = useCallback(() => {
    setOptionsOpen(false)
    setEditMode(false)
    setFlowPanel(null)
    onSwipeOpenChange(task.id)
  }, [onSwipeOpenChange, task.id])

  const closeOptions = useCallback(() => {
    setOptionsOpen(false)
    setEditMode(false)
    setFlowPanel(null)
  }, [])

  const toggleOptions = () => {
    if (task.completed || editMode) return
    if (optionsOpen) closeOptions()
    else setOptionsOpen(true)
    triggerHaptic(6)
  }

  const commitTitle = useCallback(() => {
    updateTask(task.id, { title: titleDraft })
    setEditMode(false)
  }, [task.id, titleDraft, updateTask])

  const displayTranslate = (() => {
    if (dragDelta !== 0) {
      return dragOriginOpen ? txOpenDrag(dragDelta) : txClosed(dragDelta)
    }
    return rowSwipeOpen ? -SWIPE_BASE : 0
  })()

  const deleteCharge = Math.min(1, Math.max(0, (-displayTranslate - SWIPE_BASE) / 40))

  const onTouchStart = (e: React.TouchEvent) => {
    if (task.completed) return
    suppressNextClick.current = false
    startX.current = e.touches[0].clientX
    setDragOriginOpen(rowSwipeOpen)
    setDragDelta(0)
    dragDeltaRef.current = 0
    maxOvershootRef.current = 0
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (task.completed) return
    const delta = e.touches[0].clientX - startX.current
    dragDeltaRef.current = delta
    setDragDelta(delta)
    if (Math.abs(delta) > 14) suppressNextClick.current = true
    const tx = dragOriginOpen ? txOpenDrag(delta) : txClosed(delta)
    maxOvershootRef.current = Math.max(maxOvershootRef.current, Math.max(0, -tx - SWIPE_BASE))
  }

  const onTouchEnd = () => {
    if (task.completed) return
    const d = dragDeltaRef.current
    const finalTx = dragOriginOpen ? txOpenDrag(d) : txClosed(d)

    if (maxOvershootRef.current > 22) {
      onRequestDelete(task.id)
      triggerHaptic([30, 40, 30])
      closeSwipe()
    } else if (!dragOriginOpen) {
      if (finalTx <= -SWIPE_BASE * 0.35) openSwipe()
      else closeSwipe()
    } else {
      if (finalTx > -SWIPE_BASE * 0.38) closeSwipe()
      else openSwipe()
    }
    setDragDelta(0)
    dragDeltaRef.current = 0
    maxOvershootRef.current = 0
    window.setTimeout(() => {
      suppressNextClick.current = false
    }, 32)
  }

  return (
    <div
      data-task-swipe-row
      className="group relative touch-pan-y overflow-hidden rounded-none border border-transparent transition-colors duration-200 [transition-timing-function:var(--ease-ios)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] focus-within:border-[var(--border-default)] animate-fadeIn"
    >
      {!task.completed ? (
        <div
          data-task-actions
          className="pointer-events-none absolute inset-y-0 right-0 z-0 flex border-l border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
          style={{ width: SWIPE_BASE }}
          aria-hidden
        >
          <button
            type="button"
            tabIndex={-1}
            style={{ width: W_LATER }}
            className="pointer-events-auto flex shrink-0 items-center justify-center bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
            onClick={() => {
              rescheduleLaterToday(task.id)
              triggerHaptic(12)
              closeSwipe()
            }}
          >
            Later today
          </button>
          <div className="w-px shrink-0 bg-[var(--border-default)]" />
          <button
            type="button"
            tabIndex={-1}
            style={{ width: W_TOM }}
            className="pointer-events-auto flex shrink-0 items-center justify-center bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
            onClick={() => {
              rescheduleTomorrow(task.id)
              triggerHaptic(12)
              closeSwipe()
            }}
          >
            Tomorrow
          </button>
          <div className="w-px shrink-0 bg-[var(--border-default)]" />
          <div
            style={{ width: W_DEL }}
            className={`pointer-events-none flex shrink-0 flex-col items-center justify-center border-l border-transparent text-[10px] font-bold uppercase tracking-wide transition-colors duration-150 ${
              deleteCharge > 0.55
                ? 'bg-[var(--priority-high)]/25 text-[var(--priority-high)]'
                : deleteCharge > 0.12
                  ? 'bg-[var(--priority-high)]/12 text-[var(--text-secondary)]'
                  : 'text-[var(--text-tertiary)]'
            }`}
          >
            <Icon name="trash" size={14} className="mb-0.5 opacity-80" />
            Delete
          </div>
        </div>
      ) : null}

      <div
        data-swipe-open={rowSwipeOpen || dragDelta !== 0 ? task.id : undefined}
        className={`relative z-[1] bg-[var(--bg-elevated)] px-2 py-[var(--task-py)] transition-transform duration-200 [transition-timing-function:var(--ease-ios)] ${
          task.completed ? 'opacity-60' : ''
        } ${justCompleted ? 'animate-taskCompleteSoft' : ''}`}
        style={{ transform: `translateX(${displayTranslate}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="poco-press flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)]"
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            onClick={(e) => {
              e.stopPropagation()
              if (!task.completed) setJustCompleted(true)
              toggleComplete(task.id)
              window.setTimeout(() => setJustCompleted(false), 450)
              triggerHaptic(8)
            }}
          >
            {task.completed ? (
              <span className="flex h-4 w-4 items-center justify-center bg-[var(--accent)] text-[var(--text-inverse)]">
                <Icon name="check" size={10} />
              </span>
            ) : null}
          </button>

          <div
            className="min-w-0 flex-1 cursor-pointer"
            role="button"
            tabIndex={0}
            data-task-options-anchor
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleOptions()
              }
            }}
            onClick={() => {
              if (suppressNextClick.current) return
              toggleOptions()
            }}
          >
            {editMode ? (
              <input
                className="poco-input w-full rounded-none border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-1.5 text-sm font-medium"
                value={titleDraft}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => {
                  commitTitle()
                  closeOptions()
                }}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') {
                    commitTitle()
                    closeOptions()
                  }
                  if (e.key === 'Escape') {
                    setTitleDraft(task.title)
                    setEditMode(false)
                  }
                }}
                autoFocus
              />
            ) : (
              <div>
                <div className="flex items-center gap-1.5">
                  {priorityDot(task.priority)}
                  <p className="text-sm font-medium leading-snug text-[var(--text-primary)]">
                    {task.title}
                    {showTaskIds ? (
                      <span className="ml-1 align-middle font-mono text-[10px] font-normal text-[var(--text-tertiary)]">
                        {task.id.slice(0, 8)}…
                      </span>
                    ) : null}
                  </p>
                </div>
                {task.description ? (
                  <p className="mt-0.5 text-xs leading-snug text-[var(--text-secondary)]">{task.description}</p>
                ) : null}
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {task.pinned ? <Icon name="pin" size={12} className="text-[var(--pin-color)]" /> : null}
                  {(task.estimatedPomodoros > 0 || task.actualPomodoros > 0) && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[var(--text-tertiary)]">
                      <Icon name="flame" size={12} className="text-[var(--priority-medium)]" />
                      {task.actualPomodoros}/{task.estimatedPomodoros || '—'}
                    </span>
                  )}
                  {formatTaskDueDisplay(task.dueDate, task.dueTime) ? (
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
                      {formatTaskDueDisplay(task.dueDate, task.dueTime)}
                    </span>
                  ) : null}
                  {task.recurrence ? (
                    <span className="text-[10px] text-[var(--text-tertiary)]">{task.recurrence.label}</span>
                  ) : null}
                  {scheduleChip(task.scheduledFor)}
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col justify-center">
            {editMode ? (
              <button
                type="button"
                className="poco-press rounded-none bg-[var(--accent)] px-2 py-1.5 text-xs font-semibold text-[var(--text-inverse)]"
                onClick={(e) => {
                  e.stopPropagation()
                  commitTitle()
                  closeOptions()
                }}
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                className="poco-press flex h-8 w-8 items-center justify-center rounded-none border-0 bg-transparent text-[var(--text-secondary)] transition-opacity duration-200 [transition-timing-function:var(--ease-ios)]"
                aria-label="Open focus with task"
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentTask(task.id)
                  navigate('/focus')
                  triggerHaptic(10)
                }}
              >
                <Icon name="timer" size={16} />
              </button>
            )}
          </div>
        </div>

        {optionsOpen && !task.completed ? (
          <div
            className="poco-task-options-enter mt-2 border-t border-[var(--border-subtle)] pt-2"
            data-task-options
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex gap-1">
              <button
                type="button"
                className={`${toolBtn} ${flowPanel === 'when' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : ''}`}
                onClick={() => setFlowPanel((f) => (f === 'when' ? null : 'when'))}
              >
                <Icon name="calendar" size={16} />
                <span className="text-[10px] font-semibold leading-tight">When</span>
              </button>
              <button
                type="button"
                className={`${toolBtn} ${flowPanel === 'priority' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : ''}`}
                onClick={() => setFlowPanel((f) => (f === 'priority' ? null : 'priority'))}
              >
                <Icon name="flag" size={16} />
                <span className="text-[10px] font-semibold leading-tight">Priority</span>
              </button>
              <button
                type="button"
                className={`${toolBtn} ${task.pinned ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : ''}`}
                onClick={() => {
                  if (task.pinned) unpinTask(task.id)
                  else pinTask(task.id)
                  triggerHaptic(10)
                }}
              >
                <Icon name="pin" size={16} />
                <span className="text-[10px] font-semibold leading-tight">Pin</span>
              </button>
              <button
                type="button"
                className={toolBtn}
                onClick={() => {
                  setTitleDraft(task.title)
                  setEditMode(true)
                }}
              >
                <Icon name="edit" size={16} />
                <span className="text-[10px] font-semibold leading-tight">Rename</span>
              </button>
              <button type="button" className={toolBtn} onClick={() => onOpenDetail(task)}>
                <Icon name="more-h" size={16} />
                <span className="text-[10px] font-semibold leading-tight">Details</span>
              </button>
              <button
                type="button"
                className={`${toolBtn} text-[var(--priority-high)] active:bg-[var(--bg-subtle)]`}
                onClick={() => onRequestDelete(task.id)}
              >
                <Icon name="trash" size={16} />
                <span className="text-[10px] font-semibold leading-tight">Delete</span>
              </button>
            </div>

            {flowPanel === 'when' ? (
              <div className="flex min-h-9 w-full items-stretch gap-1 border-t border-[var(--border-subtle)] pt-2">
                {(['inbox', 'today', 'tomorrow', 'someday'] as ScheduledFor[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`poco-press flex min-h-8 flex-1 items-center justify-center rounded-none border px-1 py-1.5 text-[11px] font-semibold capitalize leading-tight ${
                      task.scheduledFor === h
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)]'
                    }`}
                    onClick={() => updateTask(task.id, { scheduledFor: h })}
                  >
                    {h}
                  </button>
                ))}
              </div>
            ) : null}

            {flowPanel === 'priority' ? (
              <div className="flex min-h-9 w-full items-stretch gap-1 border-t border-[var(--border-subtle)] pt-2">
                {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`poco-press flex min-h-8 flex-1 items-center justify-center gap-1 rounded-none border px-1 py-1.5 text-[11px] font-semibold capitalize leading-tight ${
                      task.priority === p
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)]'
                    }`}
                    onClick={() => updateTask(task.id, { priority: p })}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-none ${priBg[p]}`} />
                    <span className="truncate">{p}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
