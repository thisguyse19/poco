import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Priority, ScheduledFor, Task } from '../../types'
import { formatTaskDueDisplay } from '../../utils/formatTaskDue'
import { triggerHaptic } from '../../utils/haptics'
import { Icon } from '../ui/Icon'
import { useTaskStore } from '../../stores/taskStore'
import { useTimerStore } from '../../stores/timerStore'

const SW = 160 /** 10rem */

const toolBtn =
  'poco-press flex h-11 min-w-[2.5rem] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)] px-0.5 py-1 text-[var(--text-secondary)] transition-colors'

const priBg: Record<Priority, string> = {
  low: 'bg-[var(--priority-low)]',
  medium: 'bg-[var(--priority-medium)]',
  high: 'bg-[var(--priority-high)]',
}

function priorityDot(p: Priority) {
  return <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${priBg[p]}`} />
}

function scheduleChip(s: ScheduledFor) {
  const label =
    s === 'inbox' ? 'Inbox' : s === 'today' ? 'Today' : s === 'tomorrow' ? 'Tomorrow' : 'Someday'
  const cls =
    s === 'today'
      ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
      : s === 'tomorrow'
        ? 'border-[var(--priority-low)]/40 bg-[var(--bg-subtle)] text-[var(--priority-low)]'
        : s === 'inbox'
          ? 'border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
          : 'border-[var(--pin-color)]/30 bg-[var(--bg-subtle)] text-[var(--pin-color)]'
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

type Flow = 'when' | 'priority' | null

export function TaskItem({
  task,
  onOpenDetail,
  onRequestDelete,
}: {
  task: Task
  onOpenDetail: (t: Task) => void
  onRequestDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  const updateTask = useTaskStore((s) => s.updateTask)
  const toggleComplete = useTaskStore((s) => s.toggleComplete)
  const pinTask = useTaskStore((s) => s.pinTask)
  const unpinTask = useTaskStore((s) => s.unpinTask)
  const rescheduleLaterToday = useTaskStore((s) => s.rescheduleLaterToday)
  const rescheduleTomorrow = useTaskStore((s) => s.rescheduleTomorrow)
  const setCurrentTask = useTimerStore((s) => s.setCurrentTask)

  const [editMode, setEditMode] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [flowPanel, setFlowPanel] = useState<Flow>(null)
  const [swipeOpen, setSwipeOpen] = useState(false)
  const [dragDelta, setDragDelta] = useState(0)
  const [dragOriginOpen, setDragOriginOpen] = useState(false)
  const startX = useRef(0)
  const dragDeltaRef = useRef(0)
  const [justCompleted, setJustCompleted] = useState(false)

  const commitTitle = useCallback(() => {
    updateTask(task.id, { title: titleDraft })
    setEditMode(false)
    setFlowPanel(null)
  }, [task.id, titleDraft, updateTask])

  const displayTranslate = (() => {
    if (dragDelta !== 0) {
      return dragOriginOpen ? Math.max(-SW, -SW + dragDelta) : Math.min(0, dragDelta)
    }
    return swipeOpen ? -SW : 0
  })()

  const onTouchStart = (e: React.TouchEvent) => {
    if (task.completed) return
    startX.current = e.touches[0].clientX
    setDragOriginOpen(swipeOpen)
    setDragDelta(0)
    dragDeltaRef.current = 0
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (task.completed) return
    const delta = e.touches[0].clientX - startX.current
    dragDeltaRef.current = delta
    setDragDelta(delta)
  }
  const onTouchEnd = () => {
    if (task.completed) return
    const d = dragDeltaRef.current
    const tx = dragOriginOpen ? Math.max(-SW, -SW + d) : Math.min(0, d)
    if (!dragOriginOpen) {
      setSwipeOpen(tx <= -SW / 2)
    } else {
      setSwipeOpen(!(tx > -SW / 2))
    }
    setDragDelta(0)
    dragDeltaRef.current = 0
  }

  return (
    <div className="group relative animate-fadeIn overflow-hidden rounded-[var(--radius-md)] transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] touch-pan-y">
      {!task.completed ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-0 flex w-[10rem] border-l border-[var(--border-subtle)]"
          aria-hidden
        >
          <button
            type="button"
            tabIndex={-1}
            className="pointer-events-auto flex flex-1 items-center justify-center bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
            onClick={() => {
              rescheduleLaterToday(task.id)
              triggerHaptic(12)
              setSwipeOpen(false)
            }}
          >
            Later today
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="pointer-events-auto flex flex-1 items-center justify-center bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
            onClick={() => {
              rescheduleTomorrow(task.id)
              triggerHaptic(12)
              setSwipeOpen(false)
            }}
          >
            Tomorrow
          </button>
        </div>
      ) : null}

      <div
        className={`relative z-[1] bg-[var(--bg-elevated)] px-2 py-[var(--task-py,0.625rem)] transition-transform duration-200 ease-out ${
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
            className="poco-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)]"
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            onClick={() => {
              if (!task.completed) setJustCompleted(true)
              toggleComplete(task.id)
              window.setTimeout(() => setJustCompleted(false), 450)
              triggerHaptic(8)
            }}
          >
            {task.completed ? (
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--accent)] text-[var(--text-inverse)]">
                <Icon name="check" size={10} />
              </span>
            ) : (
              <span className="h-[18px] w-[18px] rounded-full border-[1.5px] border-[var(--border-default)]" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            {editMode ? (
              <input
                className="poco-input h-9 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-input)] px-2 text-sm font-medium"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle()
                  if (e.key === 'Escape') {
                    setTitleDraft(task.title)
                    setEditMode(false)
                  }
                }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className="w-full text-left"
                disabled={task.completed}
                tabIndex={task.completed ? -1 : 0}
                onClick={() => {
                  if (!task.completed) {
                    setTitleDraft(task.title)
                    setEditMode(true)
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  {priorityDot(task.priority)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-[var(--text-primary)]">{task.title}</p>
                    {task.description ? (
                      <p className="mt-0.5 pl-[15px] text-xs text-[var(--text-secondary)]">{task.description}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-[15px]">
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
                </div>
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {editMode ? (
              <button
                type="button"
                className="poco-press h-9 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--text-inverse)]"
                onClick={commitTitle}
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                className={`poco-press flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-transparent text-[var(--text-secondary)] md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100 ${
                  task.completed ? 'invisible' : ''
                }`}
                aria-label="Open focus with task"
                onClick={() => {
                  setCurrentTask(task.id)
                  navigate('/focus')
                  triggerHaptic(10)
                }}
              >
                <Icon name="timer" size={15} />
              </button>
            )}
          </div>
        </div>

        {editMode && !task.completed ? (
          <div className="mt-2 border-t border-[var(--border-subtle)] pt-2" data-no-edit onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  className={`${toolBtn} ${flowPanel === 'when' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : ''}`}
                  onClick={() => setFlowPanel((f) => (f === 'when' ? null : 'when'))}
                >
                  <Icon name="calendar" size={16} />
                  <span className="text-[10px] font-semibold leading-tight tracking-tight">When</span>
                </button>
                <button
                  type="button"
                  className={`${toolBtn} ${flowPanel === 'priority' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : ''}`}
                  onClick={() => setFlowPanel((f) => (f === 'priority' ? null : 'priority'))}
                >
                  <Icon name="flag" size={16} />
                  <span className="text-[10px] font-semibold leading-tight tracking-tight">Priority</span>
                </button>
                <button
                  type="button"
                  className={`${toolBtn} ${task.pinned ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : ''}`}
                  onClick={() => {
                    if (task.pinned) unpinTask(task.id)
                    else pinTask(task.id)
                    triggerHaptic(10)
                  }}
                >
                  <Icon name="pin" size={16} />
                  <span className="text-[10px] font-semibold leading-tight tracking-tight">Pin</span>
                </button>
                <button
                  type="button"
                  className={toolBtn}
                  onClick={() => onOpenDetail(task)}
                >
                  <Icon name="more-h" size={16} />
                  <span className="text-[10px] font-semibold leading-tight tracking-tight">Details</span>
                </button>
                <button
                  type="button"
                  className={`${toolBtn} border-[var(--priority-high)]/40 text-[var(--priority-high)]`}
                  onClick={() => onRequestDelete(task.id)}
                >
                  <Icon name="trash" size={16} />
                  <span className="text-[10px] font-semibold leading-tight tracking-tight">Delete</span>
                </button>
            </div>

            {flowPanel === 'when' ? (
              <div className="mt-2 flex min-h-10 w-full items-stretch gap-1.5 border-t border-[var(--border-subtle)] pt-2">
                {(['inbox', 'today', 'tomorrow', 'someday'] as ScheduledFor[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`poco-press flex min-h-9 min-w-0 flex-1 basis-0 items-center justify-center rounded-[var(--radius-sm)] border px-1 py-2 text-[11px] font-semibold leading-tight sm:text-xs ${
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
              <div className="mt-2 flex min-h-10 w-full items-stretch gap-1.5 border-t border-[var(--border-subtle)] pt-2">
                {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`poco-press flex min-h-9 min-w-0 flex-1 basis-0 items-center justify-center gap-1 rounded-[var(--radius-sm)] border px-1 py-2 text-[11px] font-semibold leading-tight sm:text-xs ${
                      task.priority === p
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)]'
                    }`}
                    onClick={() => updateTask(task.id, { priority: p })}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priBg[p]}`} />
                    <span className="truncate capitalize">{p}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {!task.completed && !editMode ? (
          <div className="mt-1 flex justify-end md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100">
            <button
              type="button"
              className="poco-press rounded-[var(--radius-sm)] px-2 py-1 text-[10px] font-semibold text-[var(--text-tertiary)]"
              onClick={() => {
                setTitleDraft(task.title)
                setEditMode(true)
              }}
            >
              Edit
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
