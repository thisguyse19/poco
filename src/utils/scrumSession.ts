import { toLocalISODate } from '../services/storage'

type Session = {
  date: string
  standUpLive?: boolean
  standDownLive?: boolean
}

const KEY = 'poco:scrum-session'

function read(): Session {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { date: toLocalISODate() }
    const o = JSON.parse(raw) as Session
    return { ...o, date: o.date ?? toLocalISODate() }
  } catch {
    return { date: toLocalISODate() }
  }
}

function write(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

function today(): string {
  return toLocalISODate()
}

export function getScrumSession(): Session {
  const s = read()
  if (s.date !== today()) {
    const fresh: Session = { date: today() }
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

export function clearStandSessions() {
  const s = getScrumSession()
  write({ ...s, standUpLive: false, standDownLive: false })
}
