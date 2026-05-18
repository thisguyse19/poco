import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Task } from '../../types'
import { storage } from '../../services/storage'
import { sortTodayTasks, useTaskStore } from '../../stores/taskStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { TaskItem } from './TaskItem'
import { UndoDeleteToast } from './UndoDeleteToast'
import { PocoConfirmDialog } from '../ui/PocoConfirmDialog'
import { TaskDetailSheet } from './TaskDetailSheet'

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

export function TaskList({ searchQuery = '' }: { searchQuery?: string }) {
  const tasks = useTaskStore((s) => s.tasks)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const restoreTask = useTaskStore((s) => s.restoreTask)
  const confirmDelete = useSettingsStore((s) => s.settings.confirmDelete)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null)
  const [undoTask, setUndoTask] = useState<Task | null>(null)
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
    const inbox: Task[] = []
    const today: Task[] = []
    const tomorrow: Task[] = []
    const someday: Task[] = []
    const completed: Task[] = []
    for (const t of tasks) {
      if (!taskMatchesSearch(t, searchQuery)) continue
      if (t.completed) {
        completed.push(t)
        continue
      }
      if (t.scheduledFor === 'inbox') inbox.push(t)
      else if (t.scheduledFor === 'today') today.push(t)
      else if (t.scheduledFor === 'tomorrow') tomorrow.push(t)
      else someday.push(t)
    }
    return { inbox, today, tomorrow, someday, completed }
  }, [tasks, searchQuery])

  const todayByCategory = useMemo(() => {
    const sorted = sortTodayTasks(today)
    const groups = new Map<string, Task[]>()
    for (const t of sorted) {
      const k = t.category || 'General'
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k)!.push(t)
    }
    const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b))
    return keys.map((cat) => ({ cat, items: groups.get(cat)! }))
  }, [today])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[calc(var(--poco-mobile-nav-height)+1rem)] pt-2 md:px-6 md:pb-6">
      {inbox.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Inbox')}
          <div className="flex flex-col gap-[var(--list-row-gap)]">
            {inbox.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onOpenDetail={setDetailTask}
                onRequestDelete={handleRequestDelete}
                swipeOpenId={swipeOpenId}
                onSwipeOpenChange={setSwipeOpenId}
              />
            ))}
          </div>
        </section>
      ) : null}

      {todayByCategory.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Today')}
          <div className="flex flex-col gap-4">
            {todayByCategory.map(({ cat, items }) => {
              const expanded = map[cat] !== false
              return (
                <div key={cat}>
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
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        {cat}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-medium text-[var(--text-tertiary)]">
                        {items.length} {items.length === 1 ? 'task' : 'tasks'} · tap to {expanded ? 'collapse' : 'expand'}
                      </span>
                    </span>
                  </button>
                  {expanded ? (
                    <div className="flex flex-col gap-[var(--list-row-gap)] border-l border-[var(--border-subtle)] pl-2 md:pl-3">
                      {items.map((t) => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          onOpenDetail={setDetailTask}
                          onRequestDelete={handleRequestDelete}
                          swipeOpenId={swipeOpenId}
                          onSwipeOpenChange={setSwipeOpenId}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {tomorrow.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Tomorrow')}
          <div className="flex flex-col gap-[var(--list-row-gap)]">
            {tomorrow.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onOpenDetail={setDetailTask}
                onRequestDelete={handleRequestDelete}
                swipeOpenId={swipeOpenId}
                onSwipeOpenChange={setSwipeOpenId}
              />
            ))}
          </div>
        </section>
      ) : null}

      {someday.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Someday')}
          <div className="flex flex-col gap-[var(--list-row-gap)]">
            {someday.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onOpenDetail={setDetailTask}
                onRequestDelete={handleRequestDelete}
                swipeOpenId={swipeOpenId}
                onSwipeOpenChange={setSwipeOpenId}
              />
            ))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Done')}
          <div className="flex flex-col gap-[var(--list-row-gap)] opacity-90">
            {completed.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onOpenDetail={setDetailTask}
                onRequestDelete={handleRequestDelete}
                swipeOpenId={swipeOpenId}
                onSwipeOpenChange={setSwipeOpenId}
              />
            ))}
          </div>
        </section>
      ) : null}

      {tasks.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text-secondary)]">No tasks yet. Add one above.</p>
      ) : null}
      {tasks.length > 0 &&
      searchQuery.trim() &&
      inbox.length === 0 &&
      todayByCategory.length === 0 &&
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
