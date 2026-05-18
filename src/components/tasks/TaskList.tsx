import { useCallback, useMemo, useState } from 'react'
import type { Task } from '../../types'
import { storage } from '../../services/storage'
import { sortTodayTasks, useTaskStore } from '../../stores/taskStore'
import { TaskItem } from './TaskItem'
import { PocoConfirmDialog } from '../ui/PocoConfirmDialog'
import { TaskDetailSheet } from './TaskDetailSheet'

function sectionTitle(text: string) {
  return (
    <h3 className="px-1 py-2 font-serif text-lg text-[var(--text-primary)]">{text}</h3>
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

export function TaskList() {
  const tasks = useTaskStore((s) => s.tasks)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const { map, toggle } = useCategoryExpanded()

  const { inbox, today, tomorrow, someday, completed } = useMemo(() => {
    const inbox: Task[] = []
    const today: Task[] = []
    const tomorrow: Task[] = []
    const someday: Task[] = []
    const completed: Task[] = []
    for (const t of tasks) {
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
  }, [tasks])

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
          <div className="flex flex-col gap-1">
            {inbox.map((t) => (
              <TaskItem key={t.id} task={t} onOpenDetail={setDetailTask} onRequestDelete={setConfirmDeleteId} />
            ))}
          </div>
        </section>
      ) : null}

      {todayByCategory.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Today')}
          <div className="flex flex-col gap-3">
            {todayByCategory.map(({ cat, items }) => {
              const expanded = map[cat] !== false
              return (
                <div key={cat}>
                  <button
                    type="button"
                    className="poco-press mb-1 flex w-full items-center justify-between rounded-[var(--radius-sm)] px-1 py-2 text-left"
                    onClick={() => toggle(cat)}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                      {cat}
                    </span>
                    <span className="text-[var(--text-tertiary)]">{expanded ? '−' : '+'}</span>
                  </button>
                  {expanded ? (
                    <div className="flex flex-col gap-1">
                      {items.map((t) => (
                        <TaskItem key={t.id} task={t} onOpenDetail={setDetailTask} onRequestDelete={setConfirmDeleteId} />
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
          <div className="flex flex-col gap-1">
            {tomorrow.map((t) => (
              <TaskItem key={t.id} task={t} onOpenDetail={setDetailTask} onRequestDelete={setConfirmDeleteId} />
            ))}
          </div>
        </section>
      ) : null}

      {someday.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Someday')}
          <div className="flex flex-col gap-1">
            {someday.map((t) => (
              <TaskItem key={t.id} task={t} onOpenDetail={setDetailTask} onRequestDelete={setConfirmDeleteId} />
            ))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section className="mb-[var(--section-gap)]">
          {sectionTitle('Done')}
          <div className="flex flex-col gap-1 opacity-90">
            {completed.map((t) => (
              <TaskItem key={t.id} task={t} onOpenDetail={setDetailTask} onRequestDelete={setConfirmDeleteId} />
            ))}
          </div>
        </section>
      ) : null}

      {tasks.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text-secondary)]">No tasks yet. Add one above.</p>
      ) : null}

      <PocoConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete task?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) deleteTask(confirmDeleteId)
          setConfirmDeleteId(null)
        }}
      />

      {detailTask ? (
        <TaskDetailSheet
          task={detailTask}
          open
          onClose={() => setDetailTask(null)}
          onRequestDelete={(id) => {
            setDetailTask(null)
            setConfirmDeleteId(id)
          }}
        />
      ) : null}
    </div>
  )
}
