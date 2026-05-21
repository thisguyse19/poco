import { useEffect, useMemo, useRef, useState } from 'react'
import { HomeSearchControl } from '../components/tasks/HomeSearchControl'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskList, taskListCategoryExpandKey, type TaskListScrum } from '../components/tasks/TaskList'
import { ScrumSprintStrip } from '../components/scrum/ScrumSprintStrip'
import { useSettingsStore } from '../stores/settingsStore'
import { useTaskStore } from '../stores/taskStore'
import { storage, toLocalISODate } from '../services/storage'
import {
  getScrumBanner,
  isScrumInlinePhase,
  isStandDownCollectionWindow,
  isStandUpCollectionWindow,
  applyScrumScheduleBannerCompletionGuards,
  isScrumMasterRhythmActive,
  scrumEndStandDownLabel,
  scrumEndStandUpLabel,
  scrumLiveSubtitle,
  scrumNotifyOptInCta,
  scrumQuickAddStandDownPlaceholder,
  scrumQuickAddStandUpPlaceholder,
  scrumSessionHeaderParts,
  SCRUM_MASTER_CATEGORY,
} from '../utils/scrumMaster'
import { writeScrumFlatPreference } from '../utils/scrumFlatStorage'
import {
  endStandDownSession,
  endStandUpSession,
  getActiveFarewell,
  getScrumSession,
  SCRUM_SESSION_STORAGE_KEY,
  setStandDownLive,
  setStandUpLive,
} from '../utils/scrumSession'
import { subscribeVisibleMinuteAligned } from '../utils/minuteWallSubscribe'
import { useScrumNotifications, requestScrumNotificationPermission } from '../hooks/useScrumNotifications'

export function HomePage() {
  const settings = useSettingsStore((s) => s.settings)
  const tasks = useTaskStore((s) => s.tasks)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [clock, setClock] = useState(0)
  const [wallMs, setWallMs] = useState(() => Date.now())
  const [sessTick, setSessTick] = useState(0)
  const [taskListKey, setTaskListKey] = useState(0)
  const [smSessionEnter, setSmSessionEnter] = useState(false)
  const prevLive = useRef(false)

  const sm = settings.scrumMaster

  useScrumNotifications(sm)

  useEffect(() => {
    const bump = () => setSessTick((x) => x + 1)
    window.addEventListener('poco-scrum-session-changed', bump)
    const onStorage = (e: StorageEvent) => {
      if (e.key === SCRUM_SESSION_STORAGE_KEY) bump()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('poco-scrum-session-changed', bump)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    return subscribeVisibleMinuteAligned(() => {
      setClock((c) => c + 1)
      setWallMs(Date.now())
    })
  }, [])

  const session = useMemo(() => {
    void sessTick
    void clock
    return getScrumSession()
  }, [sessTick, clock])

  const scheduleBanner = useMemo(() => {
    void clock
    void sessTick
    const s = getScrumSession()
    const base = getScrumBanner(sm)
    return applyScrumScheduleBannerCompletionGuards(base, s)
  }, [sm, clock, sessTick])

  const smRhythmActive = useMemo(() => {
    void clock
    void sessTick
    const s = getScrumSession()
    return isScrumMasterRhythmActive(sm, s)
  }, [sm, clock, sessTick])

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
  const gatherSectionCue = useMemo(() => {
    void clock
    return isScrumInlinePhase(sm)
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

  const greeting = useMemo(() => {
    if (standUpLive) {
      const { emphasis, after } = scrumSessionHeaderParts(sm.personality, 'standUp')
      return (
        <>
          <span className="poco-scrum-title-glow">{emphasis}</span>
          {after}
        </>
      )
    }
    if (standDownLive) {
      const { emphasis, after } = scrumSessionHeaderParts(sm.personality, 'standDown')
      return (
        <>
          <span className="poco-scrum-title-glow">{emphasis}</span>
          {after}
        </>
      )
    }
    const h = new Date().getHours()
    const seg = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
    const n = settings.profileName?.trim()
    return n ? `${seg}, ${n}` : seg
  }, [settings.profileName, standUpLive, standDownLive, sm.personality])

  const subtitle = useMemo(() => {
    if (standUpLive) return { kind: 'single' as const, text: scrumLiveSubtitle(sm.personality, true) }
    if (standDownLive) return { kind: 'single' as const, text: scrumLiveSubtitle(sm.personality, false) }
    const line = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date())
    return { kind: 'home' as const, dateLine: line }
  }, [standUpLive, standDownLive, sm.personality])

  const headerDimmed = searchOpen || searchQuery.trim().length > 0

  const planSnapshotIds = () =>
    tasks.filter((t) => t.scheduledFor === 'today' && t.category === SCRUM_MASTER_CATEGORY).map((t) => t.id)

  const scrumQuick: {
    categoryLock: string | null
    placeholderOverride?: string
    scrumGlow: boolean
  } = standUpLive
    ? {
        categoryLock: SCRUM_MASTER_CATEGORY,
        placeholderOverride: scrumQuickAddStandUpPlaceholder(sm.personality),
        scrumGlow: true,
      }
    : standDownLive
      ? {
          categoryLock: SCRUM_MASTER_CATEGORY,
          placeholderOverride: scrumQuickAddStandDownPlaceholder(sm.personality),
          scrumGlow: true,
        }
      : {
          categoryLock: null,
          scrumGlow: false,
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
        gatherSectionCue,
        onReconcileFlat: () => {
          writeScrumFlatPreference(toLocalISODate(), false)
          const m = storage.getCategoryExpanded()
          storage.saveCategoryExpanded({ ...m, [taskListCategoryExpandKey('today', SCRUM_MASTER_CATEGORY)]: true })
          setTaskListKey((k) => k + 1)
          setClock((c) => c + 1)
        },
        standUpLive,
        standDownLive,
        smRhythmActive,
        endScrum:
          standUpLive || standDownLive
            ? {
                label: standUpLive ? scrumEndStandUpLabel(sm.personality) : scrumEndStandDownLabel(sm.personality),
                onClick: () => {
                  if (standUpLive) {
                    endStandUpSession(planSnapshotIds())
                  } else {
                    endStandDownSession()
                  }
                  setSessTick((x) => x + 1)
                },
              }
            : null,
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
          {subtitle.kind === 'single' ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle.text}</p>
          ) : (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle.dateLine}</p>
          )}
          {sm.enabled && notifyDefault ? (
            <button
              type="button"
              className="mt-2 text-left text-xs font-semibold text-[var(--accent)]"
              onClick={() => void requestScrumNotificationPermission()}
            >
              {scrumNotifyOptInCta(sm.personality)}
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
      />
      <TaskList key={taskListKey} wallNowMs={wallMs} searchQuery={searchQuery} scrum={scrumList} />
    </div>
  )
}
