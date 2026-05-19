import { useEffect, useMemo, useRef, useState } from 'react'
import { HomeSearchControl } from '../components/tasks/HomeSearchControl'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskList, type TaskListScrum } from '../components/tasks/TaskList'
import { ReviewModal } from '../components/reviews/ReviewModal'
import { useSettingsStore } from '../stores/settingsStore'
import { useTaskStore } from '../stores/taskStore'
import { storage, toLocalISODate } from '../services/storage'
import {
  getScrumBanner,
  isStandDownCollectionWindow,
  isStandUpCollectionWindow,
  scrumLiveSubtitle,
  SCRUM_MASTER_CATEGORY,
} from '../utils/scrumMaster'
import { effectiveScrumFlatToday, writeScrumFlatPreference } from '../utils/scrumFlatStorage'
import { clearStandSessions, getScrumSession, setStandDownLive, setStandUpLive } from '../utils/scrumSession'
import { useScrumNotifications } from '../hooks/useScrumNotifications'

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
  const [clock, setClock] = useState(0)
  const [sessTick, setSessTick] = useState(0)
  const [taskListKey, setTaskListKey] = useState(0)
  const [smSessionEnter, setSmSessionEnter] = useState(false)
  const prevLive = useRef(false)

  const sm = settings.scrumMaster
  const gateComplete = settings.scrumMasterGateComplete

  useScrumNotifications(sm, gateComplete)

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock((c) => c + 1)
    }, 30000)
    return () => window.clearInterval(id)
  }, [])

  const session = useMemo(() => {
    void sessTick
    return getScrumSession()
  }, [sessTick])

  const banner = useMemo(() => {
    void clock
    return getScrumBanner(sm)
  }, [sm, clock])
  const standUpColl = useMemo(() => {
    void clock
    return isStandUpCollectionWindow(sm)
  }, [sm, clock])
  const standDownColl = useMemo(() => {
    void clock
    return isStandDownCollectionWindow(sm)
  }, [sm, clock])
  const flatToday = useMemo(() => {
    void clock
    return effectiveScrumFlatToday(sm)
  }, [sm, clock])

  const standUpLive = Boolean(session.standUpLive)
  const standDownLive = Boolean(session.standDownLive)

  useEffect(() => {
    const live = standUpLive || standDownLive
    if (live && !prevLive.current) {
      setSmSessionEnter(true)
      const t = window.setTimeout(() => setSmSessionEnter(false), 520)
      prevLive.current = true
      return () => window.clearTimeout(t)
    }
    if (!live) prevLive.current = false
  }, [standUpLive, standDownLive])

  const showReview = useMemo(
    () => shouldShowReview(new Date().getHours(), settings.reviewDismissedAt, settings.endOfDayReviewHour),
    [settings.reviewDismissedAt, settings.endOfDayReviewHour],
  )

  const greeting = useMemo(() => {
    if (standUpLive) {
      return (
        <>
          <span className="poco-scrum-title-glow">Stand up</span> has started.
        </>
      )
    }
    if (standDownLive) {
      return (
        <>
          <span className="poco-scrum-title-glow">Stand down</span> has started.
        </>
      )
    }
    const h = new Date().getHours()
    const seg = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
    const n = settings.profileName?.trim()
    return n ? `${seg}, ${n}` : seg
  }, [settings.profileName, standUpLive, standDownLive])

  const subtitle = useMemo(() => {
    if (standUpLive) return scrumLiveSubtitle(sm.personality, true)
    if (standDownLive) return scrumLiveSubtitle(sm.personality, false)
    const line = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date())
    const n = tasks.filter((t) => !t.completed && t.scheduledFor === 'today').length
    return `${line} · ${n} ${n === 1 ? 'task' : 'tasks'} today`
  }, [tasks, standUpLive, standDownLive, sm.personality])

  const headerDimmed = searchOpen || searchQuery.trim().length > 0

  const scrumQuick: {
    categoryLock: string | null
    placeholderOverride?: string
    scrumGlow: boolean
    showEndScrum: boolean
    endScrumLabel: string
    onEndScrum: () => void
  } = standUpLive
    ? {
        categoryLock: SCRUM_MASTER_CATEGORY,
        placeholderOverride: 'What will you be completing today?',
        scrumGlow: true,
        showEndScrum: true,
        endScrumLabel: 'End stand up',
        onEndScrum: () => {
          clearStandSessions()
          setSessTick((x) => x + 1)
        },
      }
    : standDownLive
      ? {
          categoryLock: SCRUM_MASTER_CATEGORY,
          placeholderOverride: 'What wraps up today?',
          scrumGlow: true,
          showEndScrum: true,
          endScrumLabel: 'End stand down',
          onEndScrum: () => {
            clearStandSessions()
            setSessTick((x) => x + 1)
          },
        }
      : {
          categoryLock: null,
          scrumGlow: false,
          showEndScrum: false,
          endScrumLabel: 'End',
          onEndScrum: () => {},
        }

  const scrumList: TaskListScrum | null = sm.enabled
    ? {
        enabled: true,
        masterName: sm.name,
        personality: sm.personality,
        banner,
        onBannerTap: () => {
          if (!banner.visible) return
          if (banner.kind === 'standUp') setStandUpLive(true)
          else setStandDownLive(true)
          setSessTick((x) => x + 1)
        },
        standUpCollection: standUpColl,
        standDownCollection: standDownColl,
        flatToday,
        onReconcileFlat: () => {
          writeScrumFlatPreference(toLocalISODate(), false)
          const m = storage.getCategoryExpanded()
          storage.saveCategoryExpanded({ ...m, [SCRUM_MASTER_CATEGORY]: true })
          setTaskListKey((k) => k + 1)
          setClock((c) => c + 1)
        },
        standUpLive,
        standDownLive,
      }
    : null

  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col overflow-x-hidden ${smSessionEnter ? 'poco-sm-session-enter' : ''}`}
    >
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
      <QuickAdd
        categoryLock={scrumQuick.categoryLock}
        placeholderOverride={scrumQuick.placeholderOverride}
        scrumGlow={scrumQuick.scrumGlow}
        showEndScrum={scrumQuick.showEndScrum}
        endScrumLabel={scrumQuick.endScrumLabel}
        onEndScrum={scrumQuick.onEndScrum}
      />
      <TaskList key={taskListKey} searchQuery={searchQuery} scrum={scrumList} />
      {showReview ? <ReviewModal /> : null}
    </div>
  )
}
