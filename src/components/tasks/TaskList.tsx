import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Task } from '../../types'
import { storage, toLocalISODate } from '../../services/storage'
import { sortTodayTasks, useTaskStore } from '../../stores/taskStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { TaskItem } from './TaskItem'
import { UndoDeleteToast } from './UndoDeleteToast'
import { PocoConfirmDialog } from '../ui/PocoConfirmDialog'
import { TaskDetailSheet } from './TaskDetailSheet'
import { ScrumMasterBanner } from '../scrum/ScrumMasterBanner'
import type { ScrumBannerView } from '../../utils/scrumMaster'
import {
  SCRUM_MASTER_CATEGORY,
  isScrumMasterCompletedLingering,
  scrumGatherIntoSectionTail,
  scrumStandDownReviewBody,
  scrumStandDownReviewHeading,
  scrumTaskListCategorySubtitle,
} from '../../utils/scrumMaster'
import type { ScrumMasterPersonality } from '../../types'
import type { StandUpPlanSnapshot } from '../../utils/scrumSession'

function sortTodayTasksWithSmLingerAtTop(tasks: Task[], nowMs: number): Task[] {
  const linger = tasks.filter((t) => isScrumMasterCompletedLingering(t, nowMs))
  const rest = tasks.filter((t) => !isScrumMasterCompletedLingering(t, nowMs))
  const lingerSorted = [...linger].sort(
    (a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime(),
  )
  return [...lingerSorted, ...sortTodayTasks(rest)]
}

function sectionTitle(text: string) {
  return (
    <h3 className="px-1 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
      {text}
    </h3>
  )
}

function useCategoryExpanded() {
  const [map, setMap] = useState(() => storage.getCategoryExpanded())
  const toggle = useCallback((key: string) => {
    setMap((m) => {
      const isExpanded = m[key] !== false
      const next = { ...m, [key]: !isExpanded }
      storage.saveCategoryExpanded(next)
      return next
    })
  }, [])
  return { map, toggle }
}

function taskMatchesSearch(t: Task, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const blob = [t.title, t.description, t.notes, t.category].filter(Boolean).join(' ').toLowerCase()
  return blob.includes(needle)
}

/** When SM rhythm is off, bucket Scrum Master tasks under General so they share one list with a ◆ marker. */
function todayBucketCategory(t: Task, smRhythmActive: boolean): string {
  const c = t.category || 'General'
  if (smRhythmActive || c !== SCRUM_MASTER_CATEGORY) return c
  return 'General'
}

export type TaskListScrum = {
  enabled: boolean
  masterName: string
  personality: ScrumMasterPersonality
  banner: ScrumBannerView
  onBannerTap: () => void
  standUpCollection: boolean
  standDownCollection: boolean
  standUpPlan: StandUpPlanSnapshot | null
  flatToday: boolean
  onReconcileFlat: () => void
  standUpLive: boolean
  standDownLive: boolean
  /** When true, show the dedicated “Name · Scrum Master” category; otherwise SM tasks merge into General with a ◆ marker. */
  smRhythmActive: boolean
}

export function TaskList({
  searchQuery = '',
  wallNowMs,
  scrum,
}: {
  searchQuery?: string
  /** Wall time for Scrum Master completed-task linger (updated on Home’s clock tick). */
  wallNowMs: number
  scrum?: TaskListScrum | null
}) {
  const tasks = useTaskStore((s) => s.tasks)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const restoreTask = useTaskStore((s) => s.restoreTask)
  const confirmDelete = useSettingsStore((s) => s.settings.confirmDelete)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null)
  const [undoTask, setUndoTask] = useState<Task | null>(null)
  const [reconciling, setReconciling] = useState(false)
  const { map, toggle } = useCategoryExpanded()

  useEffect(() => {
    if (!swipeOpenId) return
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      if (el.closest('[data-task-actions]')) return
      if (el.closest('[data-swipe-open]')) return
      if (el.closest('[data-task-options]')) return
      if (el.closest('[data-task-detail-sheet]')) return
      setSwipeOpenId(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [swipeOpenId])

  const pushUndo = useCallback((t: Task) => {
    setUndoTask(t)
  }, [])

  const handleRequestDelete = useCallback(
    (id: string) => {
      const t = tasks.find((x) => x.id === id)
      if (confirmDelete) setConfirmDeleteId(id)
      else {
        if (t) {
          deleteTask(id)
          pushUndo(t)
        }
      }
    },
    [confirmDelete, deleteTask, pushUndo, tasks],
  )

  const { inbox, today, tomorrow, someday, completed } = useMemo(() => {
    const nowMs = wallNowMs
    const inbox: Task[] = []
    const today: Task[] = []
    const tomorrow: Task[] = []
    const someday: Task[] = []
    const completed: Task[] = []
    for (const t of tasks) {
      if (!taskMatchesSearch(t, searchQuery)) continue
      if (t.completed) {
        if (t.scheduledFor === 'today' && isScrumMasterCompletedLingering(t, nowMs)) {
          today.push(t)
          continue
        }
        if (t.scheduledFor === 'today' && t.category === SCRUM_MASTER_CATEGORY) {
          today.push(t)
          continue
        }
        completed.push(t)
        continue
      }
      if (t.scheduledFor === 'inbox') inbox.push(t)
      else if (t.scheduledFor === 'today') today.push(t)
      else if (t.scheduledFor === 'tomorrow') tomorrow.push(t)
      else someday.push(t)
    }
    return { inbox, today, tomorrow, someday, completed }
  }, [tasks, searchQuery, wallNowMs])

  const todayByCategory = useMemo(() => {
    const nowMs = wallNowMs
    const rhythm = scrum?.smRhythmActive ?? false
    const sorted = sortTodayTasks(today)
    const groups = new Map<string, Task[]>()
    for (const t of sorted) {
      const k = todayBucketCategory(t, rhythm)
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k)!.push(t)
    }
    const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b))
    const sm = keys.filter((k) => k === SCRUM_MASTER_CATEGORY)
    const rest = keys.filter((k) => k !== SCRUM_MASTER_CATEGORY)
    return [...sm, ...rest].map((cat) => ({
      cat,
      items:
        cat === SCRUM_MASTER_CATEGORY ? sortTodayTasksWithSmLingerAtTop(groups.get(cat)!, nowMs) : sortTodayTasks(groups.get(cat)!),
    }))
  }, [today, wallNowMs, scrum?.smRhythmActive])

  const smTodayTasks = useMemo(() => today.filter((t) => t.category === SCRUM_MASTER_CATEGORY), [today])

  const scrumCategoryTitle = useCallback(
    (cat: string, count: number) => {
      if (cat !== SCRUM_MASTER_CATEGORY || !scrum?.enabled)
        return { title: cat, subtitle: `${count} ${count === 1 ? 'task' : 'tasks'}` }
      const n = scrum.masterName
      const smMode: 'idle' | 'standUp' | 'standDown' =
        scrum.standDownLive || scrum.standDownCollection
          ? 'standDown'
          : scrum.standUpLive || scrum.standUpCollection
            ? 'standUp'
            : 'idle'
      return {
        title: `${n} · Scrum Master`,
        subtitle: scrumTaskListCategorySubtitle(scrum.personality, smMode, count),
      }
    },
    [scrum],
  )

  const standDownReview = useMemo(() => {
    if (!scrum?.enabled || !scrum.standDownLive) return null
    const day = toLocalISODate()
    const plan = scrum.standUpPlan
    const extraDone = tasks.filter((t) => {
      if (t.category === SCRUM_MASTER_CATEGORY) return false
      if (!t.completed || !t.completedAt || t.scheduledFor !== 'today') return false
      if (toLocalISODate(new Date(t.completedAt)) !== day) return false
      if (plan?.date === day && plan.taskIds.includes(t.id)) return false
      return true
    }).length

    if (!plan || plan.date !== day || plan.taskIds.length === 0) {
      const params = { kind: 'noPlan' as const, extraOutsidePlan: extraDone }
      return (
        <div className="mb-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">
            {scrumStandDownReviewHeading(scrum.personality, params)}
          </p>
          <p className="mt-1">{scrumStandDownReviewBody(scrum.personality, params)}</p>
        </div>
      )
    }

    const plannedTotal = plan.taskIds.length
    const plannedDone = plan.taskIds.filter((id) => tasks.find((x) => x.id === id)?.completed).length
    const plannedOpen = plannedTotal - plannedDone

    const params = {
      kind: 'withPlan' as const,
      plannedDone,
      plannedTotal,
      plannedOpen,
      extraOutsidePlan: extraDone,
    }
    return (
      <div className="mb-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
        <p className="font-semibold text-[var(--text-primary)]">
          {scrumStandDownReviewHeading(scrum.personality, params)}
        </p>
        <p className="mt-1">{scrumStandDownReviewBody(scrum.personality, params)}</p>
      </div>
    )
  }, [scrum, tasks])

  const sortedFlatToday = useMemo(
    () => sortTodayTasksWithSmLingerAtTop(today, wallNowMs),
    [today, wallNowMs],
  )

  const gatherScrum = () => {
    setReconciling(true)
    window.setTimeout(() => {
      scrum?.onReconcileFlat()
      setReconciling(false)
    }, 380)
  }

  const renderTask = (t: Task, scrumMark: boolean) => (
    <TaskItem
      key={t.id}
      task={t}
      onOpenDetail={setDetailTask}
      onRequestDelete={handleRequestDelete}
      swipeOpenId={swipeOpenId}
      onSwipeOpenChange={setSwipeOpenId}
      scrumMark={scrumMark}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[calc(var(--poco-mobile-nav-height)+1rem)] pt-2 md:px-6 md:pb-6">
      {scrum?.enabled ? (
        <ScrumMasterBanner
          name={scrum.masterName}
          banner={scrum.banner}
          personality={scrum.personality}
          onTapStart={scrum.onBannerTap}
        />
      ) : null}

      {inbox.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Inbox')}
          <div className="flex flex-col gap-[var(--list-row-gap)]">{inbox.map((t) => renderTask(t, false))}</div>
        </section>
      ) : null}

      {today.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Today')}
          {standDownReview}
          {scrum?.enabled && scrum.flatToday && smTodayTasks.length > 0 && scrum.smRhythmActive ? (
            <button
              type="button"
              onClick={gatherScrum}
              className="poco-scrum-glow-border poco-press mb-3 w-full rounded-[var(--radius-sm)] bg-[var(--bg-base)] px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)]"
            >
              <span className="poco-scrum-text-gradient">{scrum.masterName}</span> · {scrumGatherIntoSectionTail(scrum.personality)}
            </button>
          ) : null}

          {scrum?.enabled && scrum.flatToday ? (
            <div className={`flex flex-col gap-[var(--list-row-gap)] ${reconciling ? 'opacity-30 transition-opacity duration-300' : ''}`}>
              {sortedFlatToday.map((t) =>
                renderTask(
                  t,
                  Boolean(scrum?.enabled && t.category === SCRUM_MASTER_CATEGORY),
                ),
              )}
            </div>
          ) : todayByCategory.length > 0 ? (
            <div className="flex flex-col gap-4">
              {todayByCategory.map(({ cat, items }) => {
                const expanded = map[cat] !== false
                const isSm = cat === SCRUM_MASTER_CATEGORY && scrum?.enabled && scrum.smRhythmActive
                const { title, subtitle } = scrumCategoryTitle(cat, items.length)
                const inner = (
                  <>
                    <button
                      type="button"
                      className="poco-press mb-1.5 flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2.5 py-1.5 text-left md:px-3 md:py-2"
                      onClick={() => toggle(cat)}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] text-xs font-bold text-[var(--accent)]"
                        aria-hidden
                      >
                        {expanded ? '−' : '+'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        {title}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium tabular-nums text-[var(--text-tertiary)]">{subtitle}</span>
                    </button>
                    {expanded ? (
                      <div className="flex flex-col gap-[var(--list-row-gap)] border-l border-[var(--border-subtle)] pl-2 md:pl-3">
                        {items.map((t) =>
                          renderTask(
                            t,
                            Boolean(
                              scrum?.enabled &&
                                t.category === SCRUM_MASTER_CATEGORY &&
                                !(cat === SCRUM_MASTER_CATEGORY && scrum.smRhythmActive),
                            ),
                          ),
                        )}
                      </div>
                    ) : null}
                  </>
                )
                return (
                  <div key={cat} className={isSm ? 'poco-scrum-panel' : undefined}>
                    {inner}
                  </div>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {tomorrow.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Tomorrow')}
          <div className="flex flex-col gap-[var(--list-row-gap)]">
            {tomorrow.map((t) => renderTask(t, false))}
          </div>
        </section>
      ) : null}

      {someday.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Someday')}
          <div className="flex flex-col gap-[var(--list-row-gap)]">
            {someday.map((t) => renderTask(t, false))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Done')}
          <div className="flex flex-col gap-[var(--list-row-gap)] opacity-90">
            {completed.map((t) => renderTask(t, false))}
          </div>
        </section>
      ) : null}

      {tasks.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text-secondary)]">No tasks yet. Add one above.</p>
      ) : null}
      {tasks.length > 0 &&
      searchQuery.trim() &&
      inbox.length === 0 &&
      today.length === 0 &&
      tomorrow.length === 0 &&
      someday.length === 0 &&
      completed.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text-secondary)]">No tasks match your search.</p>
      ) : null}

      <PocoConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete task?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) {
            const t = tasks.find((x) => x.id === confirmDeleteId)
            if (t) {
              deleteTask(confirmDeleteId)
              pushUndo(t)
            }
          }
          setConfirmDeleteId(null)
        }}
      />

      <UndoDeleteToast
        task={undoTask}
        onUndo={(t) => restoreTask(t)}
        onDismiss={() => setUndoTask(null)}
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
