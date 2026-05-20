import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Priority, Task } from '../types'
import { toLocalISODate } from '../services/storage'
import { useTaskStore } from '../stores/taskStore'
import { useOobeTourStore } from '../stores/oobeTourStore'
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
import { subscribeVisibleMinuteAligned } from '../utils/minuteWallSubscribe'
import { usePointerFine } from '../hooks/usePointerFine'

const UNSCHEDULED_DROPPABLE_ID = 'poco-week-unscheduled'
const UNSCHEDULED_BIN_ID = 'poco-week-unscheduled-bin'
const ZONE_PREV_ID = 'poco-week-zone-prev'
const ZONE_NEXT_ID = 'poco-week-zone-next'

const DRAG_HOLD_MS = 220
const PAGE_FLIP_MS = 1000

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
  pointerFine,
}: {
  task: Task
  scrumAccent: boolean
  onOpenDetail: (t: Task) => void
  dragDisabled?: boolean
  pointerFine: boolean
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

  const borderEmphasis = armed && !isDragging

  useEffect(() => {
    if (!isDragging) return
    const id = window.setTimeout(() => setArmed(false), 0)
    return () => window.clearTimeout(id)
  }, [isDragging])

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
      className={`relative touch-pan-y select-none rounded-none bg-[var(--bg-elevated)] px-2.5 py-2.5 text-left md:px-3 md:py-3 ${
        borderEmphasis ? 'border border-[var(--accent)]' : 'border border-[var(--border-subtle)]'
      } ${scrumAccent ? 'poco-scrum-week-mark' : ''} ${isDragging ? 'z-10 opacity-0' : ''} ${
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
        setArmed(false)
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
      aria-label={
        pointerFine ? `${task.title}. Double-click to edit.` : `${task.title}. Double-tap to edit.`
      }
    >
      <div className="flex items-start gap-2">
        {priorityDot(task.priority)}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-[var(--text-primary)] [overflow-wrap:anywhere] md:text-base">
            {task.title}
          </p>
          {task.description ? (
            <p className="mt-1 line-clamp-3 text-xs leading-snug text-[var(--text-secondary)] [overflow-wrap:anywhere] md:text-sm">
              {task.description}
            </p>
          ) : null}
          {formatTaskDueDisplay(task.dueDate, task.dueTime) ? (
            <p className="mt-1 text-[10px] text-[var(--text-tertiary)] md:text-xs">{formatTaskDueDisplay(task.dueDate, task.dueTime)}</p>
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
  peekDrop,
  scrollLock,
}: {
  iso: string
  todayIso: string
  children: React.ReactNode
  peekDrop?: boolean
  /** While dragging a task, freeze column scroll so siblings do not jitter on touch. */
  scrollLock?: boolean
}) {
  const past = iso < todayIso
  const { setNodeRef, isOver } = useDroppable({
    id: dayDroppableId(iso),
    disabled: past,
  })
  const isToday = iso === todayIso
  const dropGlow = !past && (isOver || peekDrop)

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2 md:p-3 ${
        past ? 'opacity-70' : ''
      } ${dropGlow ? 'bg-[color-mix(in_srgb,var(--accent-soft)_88%,var(--bg-subtle))] ring-2 ring-inset ring-[var(--accent)]/45' : ''}`}
    >
      <div className="mb-2 flex shrink-0 items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
        <p className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] md:text-xs">
          {formatIsoWeekdayShortUk(iso)}
        </p>
        {isToday ? (
          <span className="shrink-0 rounded-none border border-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent)] md:px-2 md:py-0.5 md:text-[10px]">
            TODAY
          </span>
        ) : null}
        {past ? (
          <span className="shrink-0 text-[10px] text-[var(--text-tertiary)] md:text-xs">Past</span>
        ) : null}
      </div>
      <div
        className={`flex min-h-0 flex-1 flex-col gap-1.5 md:gap-2 ${
          scrollLock ? 'touch-none overflow-hidden' : 'overflow-y-auto [-webkit-overflow-scrolling:touch]'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function UnscheduledBlock({
  children,
  flash,
  peekDrop,
  scrollLock,
}: {
  children: React.ReactNode
  flash?: boolean
  peekDrop?: boolean
  scrollLock?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED_DROPPABLE_ID })
  const dropGlow = flash || isOver || peekDrop
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--bg-subtle)] p-2 md:p-3 ${
        flash
          ? 'border border-[var(--accent)] bg-[var(--accent-soft)]'
          : dropGlow
            ? 'border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent-soft)_82%,var(--bg-base))] ring-2 ring-inset ring-[var(--accent)]/40'
            : 'border border-dashed border-[var(--border-default)] bg-[var(--bg-base)]'
      }`}
    >
      <div className="mb-1.5 shrink-0 border-b border-[var(--border-subtle)] pb-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] md:text-xs">Unscheduled</p>
        <p className="text-[10px] leading-snug text-[var(--text-tertiary)] md:text-[11px]">Inbox and Someday · drop to clear date</p>
      </div>
      <div
        className={`flex min-h-0 flex-1 flex-col gap-1.5 md:gap-2 ${
          scrollLock ? 'touch-none overflow-hidden' : 'overflow-y-auto [-webkit-overflow-scrolling:touch]'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function UnscheduledBin({ flash, peekDrop }: { flash: boolean; peekDrop?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED_BIN_ID })
  const dropGlow = flash || isOver || peekDrop
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 border border-dashed px-2 py-2.5 transition-colors duration-200 md:min-h-[3.5rem] md:px-4 md:py-4 ${
        flash
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : dropGlow
            ? 'border-[var(--accent)]/80 bg-[color-mix(in_srgb,var(--accent-soft)_70%,var(--bg-base))] ring-2 ring-inset ring-[var(--accent)]/35'
            : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
      }`}
    >
      <Icon name="tasks" size={20} className="text-[var(--text-tertiary)]" />
      <span className="text-center text-[11px] font-medium text-[var(--text-secondary)] md:text-sm md:font-semibold">
        Drop here for Unscheduled
      </span>
    </div>
  )
}

function ArrowZone({
  id,
  direction,
  highlight,
  onTap,
  zoneRef,
  flipProgress = 0,
}: {
  id: string
  direction: 'up' | 'down'
  highlight: boolean
  onTap: () => void
  zoneRef: React.MutableRefObject<HTMLButtonElement | null>
  flipProgress?: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const mergedRef = useCallback(
    (node: HTMLButtonElement | null) => {
      zoneRef.current = node
      setNodeRef(node)
    },
    [setNodeRef, zoneRef],
  )

  const fill = Math.min(1, Math.max(0, flipProgress))

  return (
    <button
      ref={mergedRef}
      type="button"
      className={`poco-press relative flex h-7 w-full shrink-0 items-center justify-center overflow-hidden border-b border-[var(--border-subtle)] transition-colors duration-200 md:h-12 ${
        highlight || isOver ? 'bg-[color-mix(in_srgb,var(--accent-soft)_75%,var(--bg-subtle))]' : 'bg-[var(--bg-base)]'
      }`}
      onClick={onTap}
      aria-label={direction === 'up' ? 'Show previous four days' : 'Show next four days'}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-[var(--accent)]/35"
        style={{ height: `${fill * 100}%` }}
      />
      <Icon
        name="chevron-down"
        size={20}
        className={`relative z-[1] text-[var(--text-secondary)] ${direction === 'up' ? 'rotate-180' : ''}`}
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
  const showCompleted = useSettingsStore((s) => s.settings.aheadShowCompleted)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const pointerFine = usePointerFine()

  const [pageIndex, setPageIndex] = useState(0)
  const pageIndexRef = useRef(pageIndex)

  const [clock, setClock] = useState(0)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [zoneHighlight, setZoneHighlight] = useState<'prev' | 'next' | null>(null)
  const [flipProgress, setFlipProgress] = useState(0)
  const [unschedFlash, setUnschedFlash] = useState(false)
  const [binFlash, setBinFlash] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const zonePrevRef = useRef<HTMLButtonElement | null>(null)
  const zoneNextRef = useRef<HTMLButtonElement | null>(null)
  const flipRafRef = useRef<number | null>(null)
  const flipStartTimeRef = useRef(0)
  const activeZoneRef = useRef<'prev' | 'next' | null>(null)
  const startFlipIfNeededRef = useRef<(clientX: number, clientY: number) => void>(() => {})
  const prevPageRef = useRef(pageIndex)
  const [pageAnim, setPageAnim] = useState<'next' | 'prev' | null>(null)

  useLayoutEffect(() => {
    const prev = prevPageRef.current
    if (prev === pageIndex) return
    setPageAnim(pageIndex > prev ? 'next' : 'prev')
    prevPageRef.current = pageIndex
  }, [pageIndex])

  useEffect(() => {
    return subscribeVisibleMinuteAligned(() => setClock((c) => c + 1))
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
    if (flipRafRef.current != null) {
      cancelAnimationFrame(flipRafRef.current)
      flipRafRef.current = null
    }
  }, [])

  const clearFlipTimer = useCallback(() => {
    stopFlipInterval()
    activeZoneRef.current = null
    setZoneHighlight(null)
    setFlipProgress(0)
  }, [stopFlipInterval])

  useLayoutEffect(() => {
    pageIndexRef.current = pageIndex
  }, [pageIndex])

  useLayoutEffect(() => {
    startFlipIfNeededRef.current = (clientX: number, clientY: number) => {
      const p = pageIndexRef.current
      const inPrev = p > 0 && pointInRect(clientX, clientY, zonePrevRef.current)
      const inNext = pointInRect(clientX, clientY, zoneNextRef.current)
      const z: 'prev' | 'next' | null = inPrev ? 'prev' : inNext ? 'next' : null

      if (z !== activeZoneRef.current) {
        activeZoneRef.current = z
        setZoneHighlight(z)
        stopFlipInterval()
        setFlipProgress(0)
        if (z) {
          flipStartTimeRef.current = performance.now()
          const loop = () => {
            const now = performance.now()
            const elapsed = now - flipStartTimeRef.current
            setFlipProgress(Math.min(1, elapsed / PAGE_FLIP_MS))
            if (elapsed >= PAGE_FLIP_MS) {
              flipStartTimeRef.current = now
              setFlipProgress(0)
              const zone = activeZoneRef.current
              if (!zone) return
              setPageIndex((cur) => (zone === 'next' ? cur + 1 : Math.max(0, cur - 1)))
            }
            if (activeZoneRef.current) {
              flipRafRef.current = requestAnimationFrame(loop)
            }
          }
          flipRafRef.current = requestAnimationFrame(loop)
        }
      }
    }
  }, [stopFlipInterval])

  useEffect(() => {
    if (!activeTask) return
    const onMove = (ev: PointerEvent) => {
      startFlipIfNeededRef.current(ev.clientX, ev.clientY)
    }
    const onUp = () => {
      clearFlipTimer()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      clearFlipTimer()
    }
  }, [activeTask, clearFlipTimer])

  const onDragStart = useCallback(
    (e: DragStartEvent) => {
      clearFlipTimer()
      setDragOverId(null)
      const id = String(e.active.id)
      const t = tasks.find((x) => x.id === id)
      setActiveTask(t ?? null)
    },
    [tasks, clearFlipTimer],
  )

  const onDragOver = useCallback(
    (e: DragOverEvent) => {
      let id = e.over?.id != null ? String(e.over.id) : null
      const activeId = String(e.active.id)
      if (id === activeId) id = null
      if (
        id &&
        id !== activeId &&
        !id.startsWith('day:') &&
        id !== UNSCHEDULED_DROPPABLE_ID &&
        id !== UNSCHEDULED_BIN_ID &&
        id !== ZONE_PREV_ID &&
        id !== ZONE_NEXT_ID
      ) {
        const hoveredTask = tasks.find((x) => x.id === id)
        if (hoveredTask) {
          const p = taskWeekPlacement(hoveredTask, ctx)
          if (!p) id = null
          else if (p.kind === 'unscheduled') id = UNSCHEDULED_DROPPABLE_ID
          else if (windowSet.has(p.iso)) id = dayDroppableId(p.iso)
          else id = null
        }
      }
      setDragOverId(id)
    },
    [tasks, ctx, windowSet],
  )

  const onDragCancel = useCallback(() => {
    setActiveTask(null)
    setDragOverId(null)
    setZoneHighlight(null)
    clearFlipTimer()
  }, [clearFlipTimer])

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveTask(null)
      setDragOverId(null)
      setZoneHighlight(null)
      clearFlipTimer()
      const { active, over } = e
      if (!over) return
      const taskId = String(active.id)
      const overId = String(over.id)
      if (overId === UNSCHEDULED_DROPPABLE_ID || overId === UNSCHEDULED_BIN_ID) {
        clearWeekPlan(taskId)
        useOobeTourStore.getState().reportTry('week_drag')
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
        useOobeTourStore.getState().reportTry('week_drag')
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

  const aheadDragHint = pointerFine
    ? 'Click and hold a task to drag · double-click to edit'
    : 'Hold a task to drag · double-tap to edit'

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--border-subtle)] px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-6">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="shrink-0 font-serif text-2xl text-[var(--text-primary)] md:text-3xl">Ahead</h1>
          {activeTask && zoneHighlight ? (
            <span
              className="inline-flex max-w-[min(100%,11rem)] shrink-0 truncate rounded-none border border-green-700/35 bg-green-600/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-900 dark:border-green-400/40 dark:bg-green-400/12 dark:text-green-100 md:hidden"
              role="status"
              title="Keep holding to flip pages"
            >
              Hold to flip
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)] md:text-base">{rangeLabel}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)] md:text-xs">{aheadDragHint}</p>
        {activeTask && zoneHighlight ? (
          <p
            className="mt-2 hidden rounded-none border border-[var(--accent)]/35 bg-[var(--accent-soft)] px-2.5 py-1.5 text-center text-sm font-semibold text-[var(--accent)] md:block"
            role="status"
          >
            Keep holding to flip pages
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {pageIndex > 0 ? (
            <button
              type="button"
              className="poco-press rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)] md:px-3 md:py-2 md:text-sm"
              onClick={goToday}
            >
              Today
            </button>
          ) : null}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-[var(--text-secondary)] md:text-sm">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              checked={showCompleted}
              onChange={(e) => updateSettings({ aheadShowCompleted: e.target.checked })}
            />
            Show completed
          </label>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-[calc(var(--poco-mobile-nav-height)+1rem)] pt-2 md:px-6 md:pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          modifiers={[snapCenterToCursor]}
          autoScroll={false}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragCancel={onDragCancel}
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
                flipProgress={zoneHighlight === 'prev' ? flipProgress : 0}
              />
            ) : null}

            {pageIndex > 0 ? (
              <UnscheduledBin flash={binFlash} peekDrop={dragOverId === UNSCHEDULED_BIN_ID} />
            ) : null}

            <div
              data-oobe="week"
              className={`grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 overflow-hidden pt-1 ${
                pageAnim === 'next' ? 'poco-week-page-snap-next' : pageAnim === 'prev' ? 'poco-week-page-snap-prev' : ''
              }`}
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget) setPageAnim(null)
              }}
            >
              {weekSlots.map((slot) =>
                slot.kind === 'unscheduled' ? (
                  <UnscheduledBlock
                    key="unscheduled"
                    flash={unschedFlash}
                    peekDrop={dragOverId === UNSCHEDULED_DROPPABLE_ID}
                    scrollLock={Boolean(activeTask)}
                  >
                    {unscheduled.map((t) => (
                      <PlannerTaskCard
                        key={t.id}
                        task={t}
                        scrumAccent={scrumAccent(t)}
                        onOpenDetail={setDetailTask}
                        pointerFine={pointerFine}
                      />
                    ))}
                  </UnscheduledBlock>
                ) : (
                  <DayCell
                    key={slot.iso}
                    iso={slot.iso}
                    todayIso={todayIso}
                    peekDrop={dragOverId === dayDroppableId(slot.iso)}
                    scrollLock={Boolean(activeTask)}
                  >
                    {(byDay.get(slot.iso) ?? []).map((t) => (
                      <PlannerTaskCard
                        key={t.id}
                        task={t}
                        scrumAccent={scrumAccent(t)}
                        onOpenDetail={setDetailTask}
                        dragDisabled={slot.iso < todayIso}
                        pointerFine={pointerFine}
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
              flipProgress={zoneHighlight === 'next' ? flipProgress : 0}
            />
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div
                className={`max-w-[min(92vw,22rem)] rounded-none border border-[var(--accent)] bg-[var(--bg-elevated)] px-3 py-2.5 shadow-lg md:max-w-[min(40vw,28rem)] md:px-4 md:py-3 ${
                  activeTask.completed ? 'opacity-60' : ''
                }`}
              >
                <p className="line-clamp-3 text-sm font-medium leading-snug text-[var(--text-primary)] [overflow-wrap:anywhere] md:text-base">
                  {activeTask.title}
                </p>
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
