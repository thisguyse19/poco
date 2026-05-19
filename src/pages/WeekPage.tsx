import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Priority, Task } from '../types'
import { toLocalISODate } from '../services/storage'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { Icon } from '../components/ui/Icon'
import { TaskDetailSheet } from '../components/tasks/TaskDetailSheet'
import { PocoConfirmDialog } from '../components/ui/PocoConfirmDialog'
import { formatIsoWeekRangeUk, formatIsoWeekdayShortUk } from '../utils/dateTimeFormat'
import { formatTaskDueDisplay } from '../utils/formatTaskDue'
import { triggerHaptic } from '../utils/haptics'
import {
  getWeekFirstDayFromLocale,
  sortWeekColumnTasks,
  startOfWeekWall,
  taskWeekPlacement,
  tomorrowIsoFrom,
  weekIsoListFromStart,
} from '../utils/weekPlanner'
import { SCRUM_MASTER_CATEGORY } from '../utils/scrumMaster'

const UNSCHEDULED_DROPPABLE_ID = 'poco-week-unscheduled'

function dayDroppableId(iso: string) {
  return `day:${iso}`
}

const priBg: Record<Priority, string> = {
  low: 'bg-[var(--priority-low)]',
  medium: 'bg-[var(--priority-medium)]',
  high: 'bg-[var(--priority-high)]',
}

function priorityDot(p: Priority) {
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-none ${priBg[p]}`} aria-hidden />
}

function PlannerTaskRow({
  task,
  scrumMark,
  onOpenDetail,
  dragDisabled,
}: {
  task: Task
  scrumMark: boolean
  onOpenDetail: (t: Task) => void
  dragDisabled?: boolean
}) {
  const toggleComplete = useTaskStore((s) => s.toggleComplete)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: dragDisabled,
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-1.5 py-[var(--task-py)] ${
        isDragging ? 'z-10 opacity-60 ring-1 ring-[var(--accent)]' : ''
      }`}
    >
      <button
        type="button"
        className="poco-press flex h-7 w-6 shrink-0 touch-none items-center justify-center text-[var(--text-tertiary)]"
        aria-label="Drag to reschedule"
        {...listeners}
        {...attributes}
      >
        <Icon name="more-h" size={14} />
      </button>
      <button
        type="button"
        className={`poco-press flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-none ${
          scrumMark ? 'poco-scrum-checkbox-border' : 'border border-[var(--border-default)] bg-[var(--bg-elevated)]'
        }`}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        onClick={(e) => {
          e.stopPropagation()
          toggleComplete(task.id)
          triggerHaptic(8)
        }}
      >
        {task.completed ? (
          <span className="flex h-4 w-4 items-center justify-center bg-[var(--accent)] text-[var(--text-inverse)]">
            <Icon name="check" size={10} />
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 touch-manipulation py-0.5 text-left"
        onClick={() => onOpenDetail(task)}
      >
        <div className="flex items-center gap-1.5">
          {priorityDot(task.priority)}
          <p className="truncate text-sm font-medium leading-snug text-[var(--text-primary)]">{task.title}</p>
        </div>
        {task.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--text-secondary)]">{task.description}</p>
        ) : null}
        {formatTaskDueDisplay(task.dueDate, task.dueTime) ? (
          <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{formatTaskDueDisplay(task.dueDate, task.dueTime)}</p>
        ) : null}
      </button>
    </div>
  )
}

function PlannerColumn({
  iso,
  todayIso,
  children,
}: {
  iso: string
  todayIso: string
  children: React.ReactNode
}) {
  const past = iso < todayIso
  const { setNodeRef, isOver } = useDroppable({
    id: dayDroppableId(iso),
    disabled: past,
  })
  const isToday = iso === todayIso

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[min(100%,11.5rem)] shrink-0 flex-col border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1.5 md:w-44 ${
        isToday ? 'ring-1 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-base)]' : ''
      } ${past ? 'opacity-70' : ''} ${isOver && !past ? 'bg-[var(--accent-soft)]' : ''}`}
    >
      <div className="mb-1.5 border-b border-[var(--border-subtle)] pb-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          {formatIsoWeekdayShortUk(iso)}
        </p>
        {past ? <p className="text-[10px] text-[var(--text-tertiary)]">Past</p> : null}
      </div>
      <div className="flex min-h-[4rem] flex-col gap-[var(--list-row-gap)]">{children}</div>
      {!past ? (
        <p className="mt-1.5 text-[10px] leading-snug text-[var(--text-tertiary)]">Drop tasks here</p>
      ) : null}
    </div>
  )
}

function UnscheduledColumn({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED_DROPPABLE_ID })
  return (
    <div
      ref={setNodeRef}
      className={`flex w-[min(100%,11.5rem)] shrink-0 flex-col border border-dashed border-[var(--border-default)] bg-[var(--bg-base)] p-1.5 md:w-44 ${
        isOver ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : ''
      }`}
    >
      <div className="mb-1.5 border-b border-[var(--border-subtle)] pb-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Unscheduled</p>
        <p className="text-[10px] leading-snug text-[var(--text-tertiary)]">Inbox and Someday</p>
      </div>
      <div className="flex min-h-[4rem] flex-col gap-[var(--list-row-gap)]">{children}</div>
      <p className="mt-1.5 text-[10px] leading-snug text-[var(--text-tertiary)]">Drop to clear date</p>
    </div>
  )
}

export function WeekPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const planTaskOnDate = useTaskStore((s) => s.planTaskOnDate)
  const clearWeekPlan = useTaskStore((s) => s.clearWeekPlan)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const confirmDelete = useSettingsStore((s) => s.settings.confirmDelete)
  const smEnabled = useSettingsStore((s) => s.settings.scrumMaster.enabled)

  const [weekOffset, setWeekOffset] = useState(0)
  const [clock, setClock] = useState(0)
  const [showCompleted, setShowCompleted] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setClock((c) => c + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const todayIso = useMemo(() => {
    void clock
    return toLocalISODate()
  }, [clock])

  const weekStart = useMemo(() => {
    void clock
    const fd = getWeekFirstDayFromLocale()
    const base = startOfWeekWall(new Date(), fd)
    base.setDate(base.getDate() + weekOffset * 7)
    return base
  }, [clock, weekOffset])

  const weekIsos = useMemo(() => weekIsoListFromStart(weekStart), [weekStart])
  const weekSet = useMemo(() => new Set(weekIsos), [weekIsos])
  const rangeLabel = formatIsoWeekRangeUk(weekIsos[0]!, weekIsos[6]!)

  const ctx = useMemo(
    () => ({ todayIso, tomorrowIso: tomorrowIsoFrom(todayIso), showCompleted }),
    [todayIso, showCompleted],
  )

  const { byDay, unscheduled } = useMemo(() => {
    const byDay = new Map<string, Task[]>()
    for (const iso of weekIsos) byDay.set(iso, [])
    const uns: Task[] = []

    for (const t of tasks) {
      const p = taskWeekPlacement(t, ctx)
      if (!p) continue
      if (p.kind === 'unscheduled') {
        uns.push(t)
        continue
      }
      if (weekSet.has(p.iso)) {
        const arr = byDay.get(p.iso)!
        arr.push(t)
      } else {
        uns.push(t)
      }
    }
    for (const iso of weekIsos) {
      byDay.set(iso, [...(byDay.get(iso) ?? [])].sort(sortWeekColumnTasks))
    }
    uns.sort(sortWeekColumnTasks)
    return { byDay, unscheduled: uns }
  }, [tasks, ctx, weekIsos, weekSet])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
  )

  const onDragStart = useCallback(
    (e: DragStartEvent) => {
      const id = String(e.active.id)
      const t = tasks.find((x) => x.id === id)
      setActiveTask(t ?? null)
    },
    [tasks],
  )

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveTask(null)
      const { active, over } = e
      if (!over) return
      const taskId = String(active.id)
      const overId = String(over.id)
      if (overId === UNSCHEDULED_DROPPABLE_ID) {
        clearWeekPlan(taskId)
        triggerHaptic(12)
        return
      }
      if (overId.startsWith('day:')) {
        const iso = overId.slice(4)
        planTaskOnDate(taskId, iso)
        triggerHaptic(12)
      }
    },
    [clearWeekPlan, planTaskOnDate],
  )

  const scrumMark = useCallback(
    (t: Task) => Boolean(smEnabled && t.category === SCRUM_MASTER_CATEGORY),
    [smEnabled],
  )

  const handleRequestDelete = useCallback(
    (id: string) => {
      const t = tasks.find((x) => x.id === id)
      if (confirmDelete) setConfirmDeleteId(id)
      else if (t) deleteTask(id)
    },
    [confirmDelete, deleteTask, tasks],
  )

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--border-subtle)] px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-6">
        <h1 className="font-serif text-2xl text-[var(--text-primary)] md:text-3xl">Week</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{rangeLabel}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="poco-press rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            Previous week
          </button>
          <button
            type="button"
            className="poco-press rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            Next week
          </button>
          <button
            type="button"
            className="poco-press rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)]"
            onClick={() => setWeekOffset(0)}
          >
            This week
          </button>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            Show completed
          </label>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto px-4 pb-[calc(var(--poco-mobile-nav-height)+1rem)] pt-3 md:px-6 md:pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex min-w-min gap-2 pb-2">
            <UnscheduledColumn>
              {unscheduled.map((t) => (
                <PlannerTaskRow
                  key={t.id}
                  task={t}
                  scrumMark={scrumMark(t)}
                  onOpenDetail={setDetailTask}
                />
              ))}
            </UnscheduledColumn>
            {weekIsos.map((iso) => (
              <PlannerColumn key={iso} iso={iso} todayIso={todayIso}>
                {(byDay.get(iso) ?? []).map((t) => (
                  <PlannerTaskRow
                    key={t.id}
                    task={t}
                    scrumMark={scrumMark(t)}
                    onOpenDetail={setDetailTask}
                    dragDisabled={iso < todayIso}
                  />
                ))}
              </PlannerColumn>
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="w-[min(100%,11.5rem)] rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-2 shadow-md md:w-44">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{activeTask.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <PocoConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete task?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) {
            deleteTask(confirmDeleteId)
            setDetailTask(null)
          }
          setConfirmDeleteId(null)
        }}
      />

      {detailTask ? (
        <TaskDetailSheet
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onRequestDelete={(id) => {
            setDetailTask(null)
            handleRequestDelete(id)
          }}
        />
      ) : null}
    </div>
  )
}
