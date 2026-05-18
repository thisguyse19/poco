import { useMemo, useState } from 'react'
import { PageHeader } from '../components/tasks/PageHeader'
import { HomeSearchControl } from '../components/tasks/HomeSearchControl'
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const showReview = useMemo(
    () => shouldShowReview(new Date().getHours(), settings.reviewDismissedAt, settings.endOfDayReviewHour),
    [settings.reviewDismissedAt, settings.endOfDayReviewHour],
  )

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader searchClearance title="Tasks" subtitle="Everything is stored locally in this browser." />
      <HomeSearchControl
        open={searchOpen}
        query={searchQuery}
        onOpenChange={setSearchOpen}
        onQueryChange={setSearchQuery}
      />
      <QuickAdd />
      <TaskList searchQuery={searchQuery} />
      {showReview ? <ReviewModal /> : null}
    </div>
  )
}
