import { toLocalISODate } from '../services/storage'

export type ScrumFarewellKind = 'standUp' | 'standDown'

export type StandUpPlanSnapshot = {
  date: string
  taskIds: string[]
}

export type ScrumSessionState = {
  date: string
  standUpLive?: boolean
  standDownLive?: boolean
  /** Shown after user ends stand up / stand down until `untilMs` */
  farewell?: { kind: ScrumFarewellKind; untilMs: number }
  /** Task ids captured when stand up ended — used for stand-down completion review */
  standUpPlan?: StandUpPlanSnapshot
}

export const SCRUM_SESSION_STORAGE_KEY = 'poco:scrum-session'

const KEY = SCRUM_SESSION_STORAGE_KEY

function write(s: ScrumSessionState) {
  localStorage.setItem(KEY, JSON.stringify(s))
  window.dispatchEvent(new CustomEvent('poco-scrum-session-changed'))
}

function today(): string {
  return toLocalISODate()
}

function stripExpiredFarewell(s: ScrumSessionState): ScrumSessionState {
  if (!s.farewell || s.farewell.untilMs > Date.now()) return s
  const { farewell: _farewell, ...rest } = s
  const next = rest as ScrumSessionState
  write(next)
  return next
}

function read(): ScrumSessionState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { date: today() }
    const o = JSON.parse(raw) as ScrumSessionState
    return stripExpiredFarewell({ ...o, date: o.date ?? today() })
  } catch {
    return { date: today() }
  }
}

export function getScrumSession(): ScrumSessionState {
  const s = read()
  if (s.date !== today()) {
    const fresh: ScrumSessionState = { date: today() }
    write(fresh)
    return fresh
  }
  return s
}

export function setStandUpLive(on: boolean) {
  const s = getScrumSession()
  write({ ...s, standUpLive: on, standDownLive: on ? false : s.standDownLive })
}

export function setStandDownLive(on: boolean) {
  const s = getScrumSession()
  write({ ...s, standDownLive: on, standUpLive: on ? false : s.standUpLive })
}

/** Clears live flags only (no farewell). */
export function clearStandSessions() {
  const s = getScrumSession()
  write({ ...s, standUpLive: false, standDownLive: false })
}

/** End stand up: save today’s Scrum Master plan snapshot and show a one-minute farewell banner. */
export function endStandUpSession(planTaskIds: string[]) {
  const s = getScrumSession()
  write({
    ...s,
    standUpLive: false,
    standDownLive: false,
    standUpPlan: { date: today(), taskIds: [...new Set(planTaskIds)] },
    farewell: { kind: 'standUp', untilMs: Date.now() + 60_000 },
  })
}

/** End stand down: show a one-minute farewell banner. */
export function endStandDownSession() {
  const s = getScrumSession()
  write({
    ...s,
    standUpLive: false,
    standDownLive: false,
    farewell: { kind: 'standDown', untilMs: Date.now() + 60_000 },
  })
}

export function getActiveFarewell(session: ScrumSessionState): { kind: ScrumFarewellKind; untilMs: number } | null {
  if (!session.farewell || session.farewell.untilMs <= Date.now()) return null
  return session.farewell
}
