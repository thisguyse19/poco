import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
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
  addCalendarDaysFromIso,
  sortWeekColumnTasks,
  taskWeekPlacement,
  tomorrowIsoFrom,
} from '../utils/weekPlanner'
import { SCRUM_MASTER_CATEGORY } from '../utils/scrumMaster'

const UNSCHEDULED_DROPPABLE_ID = 'poco-week-unscheduled'
const UNSCHEDULED_BIN_ID = 'poco-week-unscheduled-bin'
const ZONE_PREV_ID = 'poco-week-zone-prev'
const ZONE_NEXT_ID = 'poco-week-zone-next'

const DRAG_HOLD_MS = 220
const PAGE_FLIP_MS = 750

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

function pointInRect(clientX: number, clientY: number, el: HTMLElement | null): boolean {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
}

function PlannerTaskCard({
  task,
  scrumAccent,
  onOpenDetail,
  dragDisabled,
}: {
  task: Task
  scrumAccent: boolean
  onOpenDetail: (t: Task) => void
  dragDisabled?: boolean
}) {
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [armed, setArmed] = useState(false)
  const touchDownAt = useRef(0)
  const lastTouchTap = useRef<{ t: number; id: string }>({ t: 0, id: '' })

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: dragDisabled,
  })
  const {
    onPointerDown: dndPointerDown,
    onPointerUp: dndPointerUp,
    onPointerCancel: dndPointerCancel,
    ...restDraggableListeners
  } = listeners ?? {}
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const borderEmphasis = (armed && !isDragging) || isDragging

  useEffect(
    () => () => {
      if (armTimer.current != null) clearTimeout(armTimer.current)
    },
    [],
  )

  const clearArmTimer = useCallback(() => {
    if (armTimer.current != null) {
      clearTimeout(armTimer.current)
      armTimer.current = null
    }
  }, [])

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...restDraggableListeners}
      {...attributes}
      className={`relative touch-none select-none rounded-none bg-[var(--bg-elevated)] px-2.5 py-2.5 text-left ${
        borderEmphasis ? 'border border-[var(--accent)]' : 'border border-[var(--border-subtle)]'
      } ${scrumAccent ? 'poco-scrum-week-mark' : ''} ${isDragging ? 'z-10 opacity-70' : ''} ${
        task.completed ? 'opacity-60' : ''
      } ${dragDisabled ? 'pointer-events-none opacity-50' : ''}`}
      onPointerDown={(e) => {
        dndPointerDown?.(e)
        if (dragDisabled) return
        clearArmTimer()
        armTimer.current = setTimeout(() => setArmed(true), DRAG_HOLD_MS)
      }}
      onPointerUp={(e) => {
        dndPointerUp?.(e)
        clearArmTimer()
        if (!isDragging) setArmed(false)
      }}
      onPointerCancel={(e) => {
        dndPointerCancel?.(e)
        clearArmTimer()
        setArmed(false)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (!dragDisabled) onOpenDetail(task)
      }}
      onTouchStart={() => {
        touchDownAt.current = Date.now()
      }}
      onTouchEnd={(e) => {
        if (dragDisabled) return
        const dur = Date.now() - touchDownAt.current
        if (dur > 450) return
        const now = Date.now()
        const prev = lastTouchTap.current
        if (prev.id === task.id && now - prev.t < 400) {
          onOpenDetail(task)
          lastTouchTap.current = { t: 0, id: '' }
          e.preventDefault()
        } else {
          lastTouchTap.current = { t: now, id: task.id }
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDetail(task)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}. Double-tap to edit.`}
    >
      <div className="flex items-start gap-2">
        {priorityDot(task.priority)}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-[var(--text-primary)] [overflow-wrap:anywhere]">{task.title}</p>
          {task.description ? (
            <p className="mt-1 line-clamp-3 text-xs leading-snug text-[var(--text-secondary)] [overflow-wrap:anywhere]">{task.description}</p>
          ) : null}
          {formatTaskDueDisplay(task.dueDate, task.dueTime) ? (
            <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{formatTaskDueDisplay(task.dueDate, task.dueTime)}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DayCell({
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
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--bg-subtle)] p-2 ${
        isToday
          ? 'border border-[var(--accent)]'
          : 'border border-[var(--border-subtle)]'
      } ${past ? 'opacity-70' : ''} ${isOver && !past ? 'bg-[var(--accent-soft)]' : ''}`}
    >
      <div className="mb-2 shrink-0 border-b border-[var(--border-subtle)] pb-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{formatIsoWeekdayShortUk(iso)}</p>
        {past ? <p className="text-[10px] text-[var(--text-tertiary)]">Past</p> : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto [-webkit-overflow-scrolling:touch]">{children}</div>
    </div>
  )
}

function UnscheduledBlock({ children, flash }: { children: React.ReactNode; flash?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED_DROPPABLE_ID })
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--bg-subtle)] p-2 ${
        flash
          ? 'border border-[var(--accent)] bg-[var(--accent-soft)]'
          : isOver
            ? 'border border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border border-dashed border-[var(--border-default)] bg-[var(--bg-base)]'
      }`}
    >
      <div className="mb-1.5 shrink-0 border-b border-[var(--border-subtle)] pb-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Unscheduled</p>
        <p className="text-[10px] leading-snug text-[var(--text-tertiary)]">Inbox and Someday · drop to clear date</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto [-webkit-overflow-scrolling:touch]">{children}</div>
    </div>
  )
}

function UnscheduledBin({ flash }: { flash: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED_BIN_ID })
  return (
    <div
      ref={setNodeRef}
      className={`flex shrink-0 items-center justify-center gap-2 border border-dashed px-2 py-2.5 transition-colors duration-200 ${
        flash
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : isOver
            ? 'border-[var(--accent)]/70 bg-[color-mix(in_srgb,var(--accent-soft)_60%,var(--bg-base))]'
            : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
      }`}
    >
      <Icon name="tasks" size={16} className="text-[var(--text-tertiary)]" />
      <span className="text-center text-[11px] font-medium text-[var(--text-secondary)]">Drop here for Unscheduled</span>
    </div>
  )
}

function ArrowZone({
  id,
  direction,
  highlight,
  onTap,
  zoneRef,
}: {
  id: string
  direction: 'up' | 'down'
  highlight: boolean
  onTap: () => void
  zoneRef: React.MutableRefObject<HTMLButtonElement | null>
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const mergedRef = useCallback(
    (node: HTMLButtonElement | null) => {
      zoneRef.current = node
      setNodeRef(node)
    },
    [setNodeRef, zoneRef],
  )

  return (
    <button
      ref={mergedRef}
      type="button"
      className={`poco-press flex h-6 w-full shrink-0 items-center justify-center border-b border-[var(--border-subtle)] transition-colors duration-200 ${
        highlight || isOver ? 'bg-[color-mix(in_srgb,var(--accent-soft)_75%,var(--bg-subtle))]' : 'bg-[var(--bg-base)]'
      }`}
      onClick={onTap}
      aria-label={direction === 'up' ? 'Show previous four days' : 'Show next four days'}
    >
      <Icon
        name="chevron-down"
        size={14}
        className={direction === 'up' ? 'rotate-180 text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]'}
      />
    </button>
  )
}

export function WeekPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const planTaskOnDate = useTaskStore((s) => s.planTaskOnDate)
  const clearWeekPlan = useTaskStore((s) => s.clearWeekPlan)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const confirmDelete = useSettingsStore((s) => s.settings.confirmDelete)
  const smEnabled = useSettingsStore((s) => s.settings.scrumMaster.enabled)

  const [pageIndex, setPageIndex] = useState(0)
  const [clock, setClock] = useState(0)
  const [showCompleted, setShowCompleted] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [zoneHighlight, setZoneHighlight] = useState<'prev' | 'next' | null>(null)
  const [unschedFlash, setUnschedFlash] = useState(false)
  const [binFlash, setBinFlash] = useState(false)

  const zonePrevRef = useRef<HTMLButtonElement | null>(null)
  const zoneNextRef = useRef<HTMLButtonElement | null>(null)
  const flipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeZoneRef = useRef<'prev' | 'next' | null>(null)
  const prevPageRef = useRef(pageIndex)
  const [pageAnim, setPageAnim] = useState<'next' | 'prev' | null>(null)

  useLayoutEffect(() => {
    const prev = prevPageRef.current
    if (prev === pageIndex) return
    setPageAnim(pageIndex > prev ? 'next' : 'prev')
    prevPageRef.current = pageIndex
  }, [pageIndex])

  useEffect(() => {
    const id = window.setInterval(() => setClock((c) => c + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const todayIso = useMemo(() => {
    void clock
    return toLocalISODate()
  }, [clock])

  const columnDayIsos = useMemo(() => {
    if (pageIndex === 0) {
      return [0, 1, 2].map((i) => addCalendarDaysFromIso(todayIso, i))
    }
    const start = addCalendarDaysFromIso(todayIso, 3 + (pageIndex - 1) * 4)
    return [0, 1, 2, 3].map((i) => addCalendarDaysFromIso(start, i))
  }, [todayIso, pageIndex])

  const weekSlots = useMemo((): Array<{ kind: 'day'; iso: string } | { kind: 'unscheduled' }> => {
    if (pageIndex === 0) {
      return [
        { kind: 'day', iso: columnDayIsos[0]! },
        { kind: 'day', iso: columnDayIsos[1]! },
        { kind: 'day', iso: columnDayIsos[2]! },
        { kind: 'unscheduled' },
      ]
    }
    return columnDayIsos.map((iso) => ({ kind: 'day' as const, iso }))
  }, [pageIndex, columnDayIsos])

  const windowSet = useMemo(() => new Set(columnDayIsos), [columnDayIsos])
  const rangeLabel = useMemo(() => {
    if (pageIndex === 0) {
      return formatIsoWeekRangeUk(columnDayIsos[0]!, columnDayIsos[2]!)
    }
    return formatIsoWeekRangeUk(columnDayIsos[0]!, columnDayIsos[3]!)
  }, [pageIndex, columnDayIsos])

  const ctx = useMemo(
    () => ({ todayIso, tomorrowIso: tomorrowIsoFrom(todayIso), showCompleted }),
    [todayIso, showCompleted],
  )

  const { byDay, unscheduled } = useMemo(() => {
    const byDay = new Map<string, Task[]>()
    for (const iso of columnDayIsos) byDay.set(iso, [])
    const uns: Task[] = []

    for (const t of tasks) {
      const p = taskWeekPlacement(t, ctx)
      if (!p) continue
      if (p.kind === 'unscheduled') {
        uns.push(t)
        continue
      }
      if (windowSet.has(p.iso)) {
        byDay.get(p.iso)!.push(t)
      } else {
        uns.push(t)
      }
    }
    for (const iso of columnDayIsos) {
      byDay.set(iso, [...(byDay.get(iso) ?? [])].sort(sortWeekColumnTasks))
    }
    uns.sort(sortWeekColumnTasks)
    return { byDay, unscheduled: uns }
  }, [tasks, ctx, columnDayIsos, windowSet])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: DRAG_HOLD_MS, tolerance: 10 },
    }),
  )

  const stopFlipInterval = useCallback(() => {
    if (flipTimerRef.current != null) {
      clearInterval(flipTimerRef.current)
      flipTimerRef.current = null
    }
  }, [])

  const clearFlipTimer = useCallback(() => {
    stopFlipInterval()
    activeZoneRef.current = null
    setZoneHighlight(null)
  }, [stopFlipInterval])

  const startFlipIfNeeded = useCallback(
    (clientX: number, clientY: number) => {
      const inPrev = pageIndex > 0 && pointInRect(clientX, clientY, zonePrevRef.current)
      const inNext = pointInRect(clientX, clientY, zoneNextRef.current)
      const z: 'prev' | 'next' | null = inPrev ? 'prev' : inNext ? 'next' : null

      if (z !== activeZoneRef.current) {
        activeZoneRef.current = z
        setZoneHighlight(z)
        stopFlipInterval()
        if (z) {
          flipTimerRef.current = window.setInterval(() => {
            setPageIndex((p) => (z === 'next' ? p + 1 : Math.max(0, p - 1)))
          }, PAGE_FLIP_MS)
        }
      }
    },
    [pageIndex, stopFlipInterval],
  )

  useEffect(() => {
    if (!activeTask) return
    const onMove = (ev: PointerEvent) => {
      startFlipIfNeeded(ev.clientX, ev.clientY)
    }
    const onUp = () => {
      stopFlipInterval()
      setZoneHighlight(null)
      activeZoneRef.current = null
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      stopFlipInterval()
    }
  }, [activeTask, startFlipIfNeeded, stopFlipInterval])

  const onDragStart = useCallback(
    (e: DragStartEvent) => {
      setZoneHighlight(null)
      const id = String(e.active.id)
      const t = tasks.find((x) => x.id === id)
      setActiveTask(t ?? null)
    },
    [tasks],
  )

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveTask(null)
      setZoneHighlight(null)
      clearFlipTimer()
      const { active, over } = e
      if (!over) return
      const taskId = String(active.id)
      const overId = String(over.id)
      if (overId === UNSCHEDULED_DROPPABLE_ID || overId === UNSCHEDULED_BIN_ID) {
        clearWeekPlan(taskId)
        if (overId === UNSCHEDULED_BIN_ID) setBinFlash(true)
        else setUnschedFlash(true)
        window.setTimeout(() => {
          setBinFlash(false)
          setUnschedFlash(false)
        }, 420)
        triggerHaptic(12)
        return
      }
      if (overId === ZONE_PREV_ID || overId === ZONE_NEXT_ID) {
        return
      }
      if (overId.startsWith('day:')) {
        const iso = overId.slice(4)
        planTaskOnDate(taskId, iso)
        triggerHaptic(12)
      }
    },
    [clearFlipTimer, clearWeekPlan, planTaskOnDate],
  )

  const scrumAccent = useCallback(
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

  const goToday = useCallback(() => {
    setPageIndex(0)
    triggerHaptic(8)
  }, [])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--border-subtle)] px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-6">
        <h1 className="font-serif text-2xl text-[var(--text-primary)] md:text-3xl">Week</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{rangeLabel}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
          Hold a task to drag · double-tap to edit
          {smEnabled ? ' · coloured strip: Scrum Master task' : ''}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="poco-press rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)]"
            onClick={goToday}
          >
            Today
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-[calc(var(--poco-mobile-nav-height)+1rem)] pt-2 md:px-6 md:pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {pageIndex > 0 ? (
              <ArrowZone
                id={ZONE_PREV_ID}
                direction="up"
                highlight={zoneHighlight === 'prev'}
                onTap={() => setPageIndex((p) => Math.max(0, p - 1))}
                zoneRef={zonePrevRef}
              />
            ) : null}

            {pageIndex > 0 ? <UnscheduledBin flash={binFlash} /> : null}

            <div
              className={`grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 overflow-hidden pt-1 ${
                pageAnim === 'next' ? 'poco-week-page-snap-next' : pageAnim === 'prev' ? 'poco-week-page-snap-prev' : ''
              }`}
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget) setPageAnim(null)
              }}
            >
              {weekSlots.map((slot) =>
                slot.kind === 'unscheduled' ? (
                  <UnscheduledBlock key="unscheduled" flash={unschedFlash}>
                    {unscheduled.map((t) => (
                      <PlannerTaskCard
                        key={t.id}
                        task={t}
                        scrumAccent={scrumAccent(t)}
                        onOpenDetail={setDetailTask}
                      />
                    ))}
                  </UnscheduledBlock>
                ) : (
                  <DayCell key={slot.iso} iso={slot.iso} todayIso={todayIso}>
                    {(byDay.get(slot.iso) ?? []).map((t) => (
                      <PlannerTaskCard
                        key={t.id}
                        task={t}
                        scrumAccent={scrumAccent(t)}
                        onOpenDetail={setDetailTask}
                        dragDisabled={slot.iso < todayIso}
                      />
                    ))}
                  </DayCell>
                ),
              )}
            </div>

            <ArrowZone
              id={ZONE_NEXT_ID}
              direction="down"
              highlight={zoneHighlight === 'next'}
              onTap={() => setPageIndex((p) => p + 1)}
              zoneRef={zoneNextRef}
            />
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div
                className={`max-w-[min(92vw,22rem)] rounded-none border border-[var(--accent)] bg-[var(--bg-elevated)] px-3 py-2.5 shadow-lg ${
                  activeTask.completed ? 'opacity-60' : ''
                }`}
              >
                <p className="line-clamp-3 text-sm font-medium leading-snug text-[var(--text-primary)] [overflow-wrap:anywhere]">{activeTask.title}</p>
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
