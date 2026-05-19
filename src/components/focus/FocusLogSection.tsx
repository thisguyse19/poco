import { useCallback, useMemo, useState } from 'react'
import type { FocusSession } from '../../types'
import { storage, toLocalISODate } from '../../services/storage'
import { useTaskStore } from '../../stores/taskStore'
import { useTimerStore } from '../../stores/timerStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { PocoBottomSheet } from '../ui/PocoBottomSheet'
import { Icon } from '../ui/Icon'

const WEEKS = 10
const ROWS = 7
/** Row 0 = Monday … row 6 = Sunday (matches grid iteration). */
const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const WEEKDAY_TITLES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

function mondayOfWeek(d: Date): Date {
  const x = new Date(d)
  const wd = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - wd)
  x.setHours(0, 0, 0, 0)
  return x
}

function minutesByDay(sessions: FocusSession[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sessions) {
    if (!s.completed || s.plannedMinutes <= 0) continue
    const day = toLocalISODate(new Date(s.startedAt))
    m.set(day, (m.get(day) ?? 0) + s.plannedMinutes)
  }
  return m
}

const LEVEL_CLASS = [
  'border border-[var(--border-subtle)] bg-[var(--bg-subtle)]',
  'border border-transparent bg-[color-mix(in_srgb,var(--accent)_22%,var(--bg-subtle))]',
  'border border-transparent bg-[color-mix(in_srgb,var(--accent)_40%,var(--bg-subtle))]',
  'border border-transparent bg-[color-mix(in_srgb,var(--accent)_62%,var(--bg-subtle))]',
  'border border-transparent bg-[color-mix(in_srgb,var(--accent)_85%,var(--bg-subtle))]',
] as const

function levelFor(min: number, max: number): number {
  if (min <= 0) return 0
  if (max <= 0) return 0
  const t = min / max
  return Math.min(4, Math.max(1, Math.ceil(t * 4)))
}

function FocusDayDetail({
  sheetDay,
  dayTotal,
  daySessions,
  taskTitle,
  onClose,
  layout,
}: {
  sheetDay: string
  dayTotal: number
  daySessions: FocusSession[]
  taskTitle: (id: string | null) => string
  onClose: () => void
  layout: 'sheet' | 'aside'
}) {
  const scrollWrap =
    layout === 'sheet'
      ? 'max-h-[min(70dvh,520px)] overflow-y-auto p-4 pb-[calc(var(--poco-mobile-nav-height)+0.75rem)]'
      : 'max-h-[min(80vh,580px)] min-h-[12rem] flex-1 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 shadow-sm'

  return (
    <div className={scrollWrap}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-serif text-lg text-[var(--text-primary)]">{sheetDay}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">{dayTotal}</strong> min across{' '}
            <strong className="text-[var(--text-primary)]">{daySessions.length}</strong> sessions
          </p>
        </div>
        <button type="button" className="poco-press p-2 text-[var(--text-tertiary)]" aria-label="Close" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </div>
      {daySessions.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No completed focus sessions logged for this day.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {daySessions.map((s) => (
            <li
              key={s.id}
              className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-left"
            >
              <p className="text-sm font-medium text-[var(--text-primary)]">{taskTitle(s.taskId)}</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {s.plannedMinutes} min · {new Date(s.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function FocusLogSection({ focusActive }: { focusActive: boolean }) {
  const [logOpen, setLogOpen] = useState(true)
  const [sheetDay, setSheetDay] = useState<string | null>(null)
  const isMdUp = useMediaQuery('(min-width: 768px)')
  const sessionsCompleted = useTimerStore((s) => s.sessionsCompleted)
  const tasks = useTaskStore((s) => s.tasks)
  const focusMin = useSettingsStore((s) => s.settings.focusDurationMinutes)

  const sessions = useMemo(
    () => storage.getSessions().filter((s) => s.completed && s.plannedMinutes > 0),
    // Re-read when the timer store records a new completed focus session.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionsCompleted is the invalidation signal
    [sessionsCompleted],
  )

  const { cells, maxMin, todayStr } = useMemo(() => {
    const byDay = minutesByDay(sessions)
    const today = new Date()
    const todayStr = toLocalISODate(today)
    const thisWeekMon = mondayOfWeek(today)
    const start = new Date(thisWeekMon)
    start.setDate(start.getDate() - (WEEKS - 1) * 7)
    const list: { date: string; min: number; future: boolean }[] = []
    let max = 0
    for (let col = 0; col < WEEKS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const d = new Date(start)
        d.setDate(d.getDate() + col * 7 + row)
        const date = toLocalISODate(d)
        const future = date > todayStr
        const min = future ? 0 : byDay.get(date) ?? 0
        if (min > max) max = min
        list.push({ date, min, future })
      }
    }
    return { cells: list, maxMin: max, todayStr }
  }, [sessions])

  const daySessions = useMemo(() => {
    if (!sheetDay) return []
    return sessions
      .filter((s) => toLocalISODate(new Date(s.startedAt)) === sheetDay)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  }, [sessions, sheetDay])

  const dayTotal = useMemo(() => daySessions.reduce((a, s) => a + s.plannedMinutes, 0), [daySessions])

  const taskTitle = useCallback(
    (id: string | null) => {
      if (!id) return 'No linked task'
      return tasks.find((t) => t.id === id)?.title ?? 'Deleted task'
    },
    [tasks],
  )

  const { totalMin, count } = useMemo(
    () => ({
      totalMin: sessions.reduce((acc, s) => acc + s.plannedMinutes, 0),
      count: sessions.length,
    }),
    [sessions],
  )

  if (focusActive) return null

  return (
    <>
      <div className="w-full shrink-0 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          className="poco-press flex w-full items-center justify-between gap-2 py-3 text-left"
          onClick={() => setLogOpen((o) => !o)}
          aria-expanded={logOpen}
        >
          <span className="flex items-center gap-2 font-serif text-lg text-[var(--text-primary)]">
            <Icon name="focus" size={18} className="text-[var(--accent)]" />
            Focus log
          </span>
          <Icon name="chevron-down" size={20} className={`text-[var(--text-tertiary)] transition-transform ${logOpen ? '' : '-rotate-90'}`} />
        </button>

        {logOpen ? (
          <div className="space-y-4 pb-6 text-sm text-[var(--text-secondary)]">
            <p>
              Logged focus time (approx.): <strong className="text-[var(--text-primary)]">{totalMin}</strong> minutes across{' '}
              <strong className="text-[var(--text-primary)]">{count}</strong> completed sessions.
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Current focus block length: {focusMin} min.</p>

            <div className="md:flex md:items-start md:gap-8">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Last {WEEKS} weeks (Mon–Sun)
                </p>
                <div className="flex items-stretch gap-1 md:gap-0.5">
                  <div className="flex shrink-0 flex-col gap-1 md:gap-0.5" aria-hidden>
                    {WEEKDAY_INITIALS.map((letter, row) => (
                      <div
                        key={row}
                        title={WEEKDAY_TITLES[row]}
                        className="flex h-9 w-5 shrink-0 items-center justify-end pr-0.5 text-[10px] font-bold leading-none tracking-tight text-[var(--text-tertiary)] md:h-2.5 md:w-4 md:justify-center md:pr-0 md:text-[8px]"
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                    <div className="flex gap-1 md:gap-0.5">
                      {Array.from({ length: WEEKS }, (_, col) => (
                        <div key={col} className="flex flex-col gap-1 md:gap-0.5">
                          {Array.from({ length: ROWS }, (_, row) => {
                            const cell = cells[col * ROWS + row]
                            if (!cell) return null
                            const lvl = cell.future ? 0 : levelFor(cell.min, maxMin)
                            const cls = LEVEL_CLASS[cell.future ? 0 : lvl]
                            const isToday = cell.date === todayStr
                            return (
                              <button
                                key={cell.date}
                                type="button"
                                disabled={cell.future}
                                title={`${WEEKDAY_TITLES[row]} ${cell.date}${cell.min ? ` · ${cell.min} min` : ''}`}
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] p-0 md:h-2.5 md:w-2.5 ${cls} ${
                                  cell.future ? 'cursor-default opacity-25' : 'poco-press cursor-pointer opacity-100'
                                } ${isToday ? 'ring-1 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-base)]' : ''}`}
                                onClick={() => {
                                  if (cell.future) return
                                  setSheetDay(cell.date)
                                }}
                              />
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-snug text-[var(--text-tertiary)] md:max-w-md">
                  Darker tiles = more completed focus minutes that day. Tap a tile for the session list
                  {isMdUp ? ' (shown beside the grid on desktop).' : '.'}
                </p>
              </div>

              {sheetDay && isMdUp ? (
                <aside className="mt-6 w-full shrink-0 md:mt-0 md:w-[min(100%,320px)] md:max-w-sm md:pt-5">
                  <FocusDayDetail
                    sheetDay={sheetDay}
                    dayTotal={dayTotal}
                    daySessions={daySessions}
                    taskTitle={taskTitle}
                    onClose={() => setSheetDay(null)}
                    layout="aside"
                  />
                </aside>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <PocoBottomSheet open={Boolean(sheetDay) && !isMdUp} onBackdropClick={() => setSheetDay(null)}>
        {sheetDay ? (
          <FocusDayDetail
            sheetDay={sheetDay}
            dayTotal={dayTotal}
            daySessions={daySessions}
            taskTitle={taskTitle}
            onClose={() => setSheetDay(null)}
            layout="sheet"
          />
        ) : null}
      </PocoBottomSheet>
    </>
  )
}
