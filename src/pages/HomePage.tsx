import { useMemo, useState } from 'react'
import { HomeSearchControl } from '../components/tasks/HomeSearchControl'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskList } from '../components/tasks/TaskList'
import { ReviewModal } from '../components/reviews/ReviewModal'
import { useSettingsStore } from '../stores/settingsStore'
import { useTaskStore } from '../stores/taskStore'
import { toLocalISODate } from '../services/storage'

function shouldShowReview(hour: number, dismissed: string | null, thresholdHour: number): boolean {
  if (hour < thresholdHour) return false
  if (!dismissed) return true
  const d = new Date(dismissed)
  const today = toLocalISODate()
  const dismissedDay = toLocalISODate(d)
  return dismissedDay !== today
}

export function HomePage() {
  const settings = useSettingsStore((s) => s.settings)
  const tasks = useTaskStore((s) => s.tasks)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const showReview = useMemo(
    () => shouldShowReview(new Date().getHours(), settings.reviewDismissedAt, settings.endOfDayReviewHour),
    [settings.reviewDismissedAt, settings.endOfDayReviewHour],
  )

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    const seg = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
    const n = settings.profileName?.trim()
    return n ? `${seg}, ${n}` : seg
  }, [settings.profileName])

  const subtitle = useMemo(() => {
    const line = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date())
    const n = tasks.filter((t) => !t.completed && t.scheduledFor === 'today').length
    return `${line} · ${n} ${n === 1 ? 'task' : 'tasks'} today`
  }, [tasks])

  const headerDimmed = searchOpen || searchQuery.trim().length > 0

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden">
      <header className="relative flex min-h-[var(--poco-page-header-min)] shrink-0 flex-col border-b border-[var(--border-subtle)] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-6">
        <div
          className={`min-w-0 transition-opacity duration-[400ms] [transition-timing-function:var(--ease-ios)] ${
            headerDimmed ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <h1 className="pr-12 font-serif text-2xl md:text-3xl">{greeting}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        </div>
        <div className="pointer-events-none absolute left-4 right-4 top-[max(1rem,env(safe-area-inset-top,0px))] flex h-10 items-center md:left-6 md:right-6">
          <div className="pointer-events-auto w-full">
            <HomeSearchControl
              open={searchOpen}
              query={searchQuery}
              onOpenChange={setSearchOpen}
              onQueryChange={setSearchQuery}
            />
          </div>
        </div>
      </header>
      <QuickAdd />
      <TaskList searchQuery={searchQuery} />
      {showReview ? <ReviewModal /> : null}
    </div>
  )
}
