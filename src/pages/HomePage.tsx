import { useEffect, useMemo, useRef, useState } from 'react'
import { HomeSearchControl } from '../components/tasks/HomeSearchControl'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskList, type TaskListScrum } from '../components/tasks/TaskList'
import { ReviewModal } from '../components/reviews/ReviewModal'
import { ScrumSprintStrip } from '../components/scrum/ScrumSprintStrip'
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
import {
  endStandDownSession,
  endStandUpSession,
  getActiveFarewell,
  getScrumSession,
  setStandDownLive,
  setStandUpLive,
} from '../utils/scrumSession'
import { useScrumNotifications, requestScrumNotificationPermission } from '../hooks/useScrumNotifications'

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

  useScrumNotifications(sm)

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock((c) => c + 1)
    }, 15_000)
    return () => window.clearInterval(id)
  }, [])

  const session = useMemo(() => {
    void sessTick
    void clock
    return getScrumSession()
  }, [sessTick, clock])

  const scheduleBanner = useMemo(() => {
    void clock
    return getScrumBanner(sm)
  }, [sm, clock])

  const banner = useMemo(() => {
    const f = getActiveFarewell(session)
    if (f) {
      return { visible: true as const, kind: f.kind === 'standUp' ? ('farewellUp' as const) : ('farewellDown' as const) }
    }
    return scheduleBanner
  }, [session, scheduleBanner])

  const farewellUntil = session.farewell?.untilMs

  useEffect(() => {
    if (!farewellUntil) return
    const ms = Math.max(0, farewellUntil - Date.now()) + 120
    const t = window.setTimeout(() => setSessTick((x) => x + 1), ms)
    return () => window.clearTimeout(t)
  }, [farewellUntil, sessTick])

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
  const farewellActive = Boolean(getActiveFarewell(session))

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

  const smUiGlow =
    sm.enabled &&
    (standUpLive ||
      standDownLive ||
      standUpColl ||
      standDownColl ||
      scheduleBanner.visible ||
      farewellActive)

  const planSnapshotIds = () =>
    tasks.filter((t) => t.scheduledFor === 'today' && t.category === SCRUM_MASTER_CATEGORY).map((t) => t.id)

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
        placeholderOverride: 'What did you commit to finish today?',
        scrumGlow: true,
        showEndScrum: true,
        endScrumLabel: 'End stand up',
        onEndScrum: () => {
          endStandUpSession(planSnapshotIds())
          setSessTick((x) => x + 1)
        },
      }
    : standDownLive
      ? {
          categoryLock: SCRUM_MASTER_CATEGORY,
          placeholderOverride: 'Note carry-overs or extra work you shipped today…',
          scrumGlow: true,
          showEndScrum: true,
          endScrumLabel: 'End stand down',
          onEndScrum: () => {
            endStandDownSession()
            setSessTick((x) => x + 1)
          },
        }
      : {
          categoryLock: null,
          scrumGlow: smUiGlow,
          showEndScrum: false,
          endScrumLabel: 'End',
          onEndScrum: () => {},
        }

  const standUpPlan =
    session.standUpPlan && session.standUpPlan.date === toLocalISODate() ? session.standUpPlan : null

  const scrumList: TaskListScrum | null = sm.enabled
    ? {
        enabled: true,
        masterName: sm.name,
        personality: sm.personality,
        banner,
        onBannerTap: () => {
          if (!banner.visible) return
          if (banner.kind === 'farewellUp' || banner.kind === 'farewellDown') return
          if (banner.kind === 'standUp') setStandUpLive(true)
          else setStandDownLive(true)
          setSessTick((x) => x + 1)
        },
        standUpCollection: standUpColl,
        standDownCollection: standDownColl,
        standUpPlan,
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

  const notifyDefault = typeof Notification !== 'undefined' && Notification.permission === 'default'

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
          {sm.enabled && notifyDefault ? (
            <button
              type="button"
              className="mt-2 text-left text-xs font-semibold text-[var(--accent)]"
              onClick={() => void requestScrumNotificationPermission()}
            >
              Turn on stand up &amp; stand down reminders
            </button>
          ) : null}
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
      {sm.enabled ? <ScrumSprintStrip sm={sm} /> : null}
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
