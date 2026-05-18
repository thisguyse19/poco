import { useMemo } from 'react'
import { PageHeader } from '../components/tasks/PageHeader'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskList } from '../components/tasks/TaskList'
import { ReviewModal } from '../components/reviews/ReviewModal'
import { useSettingsStore } from '../stores/settingsStore'
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

  const showReview = useMemo(
    () => shouldShowReview(new Date().getHours(), settings.reviewDismissedAt, settings.endOfDayReviewHour),
    [settings.reviewDismissedAt, settings.endOfDayReviewHour],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader title="Tasks" subtitle="Everything is stored locally in this browser." />
      <QuickAdd />
      <TaskList />
      {showReview ? <ReviewModal /> : null}
    </div>
  )
}
