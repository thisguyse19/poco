import { useEffect } from 'react'
import type { ScrumMasterSettings } from '../types'
import { toLocalISODate } from '../services/storage'
import { getScrumSession } from '../utils/scrumSession'
import { nowMinutes, timeToMinutes } from '../utils/scrumMaster'

function canNotify(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

function markSent(day: string, key: string): boolean {
  const k = `poco:sm-notify:${day}:${key}`
  if (localStorage.getItem(k)) return false
  localStorage.setItem(k, '1')
  return true
}

function inMinuteWindow(delta: number, target: number, widthBehind: number, widthAhead: number): boolean {
  return delta <= target + widthAhead && delta >= target - widthBehind
}

function runScrumNotificationTick(sm: ScrumMasterSettings) {
  if (!sm.enabled || !canNotify()) return

  const day = toLocalISODate()
  const n = nowMinutes()
  const tu = timeToMinutes(sm.standUpTime)
  const td = timeToMinutes(sm.standDownTime)
  const sess = getScrumSession()

  const fire = (key: string, title: string, body: string) => {
    if (!markSent(day, key)) return
    try {
      new Notification(title, { body, tag: `poco-sm-${key}`, silent: false })
    } catch {
      /* ignore */
    }
  }

  const du = n - tu
  const dd = n - td

  if (!sess.standUpLive) {
    if (inMinuteWindow(du, -10, 2, 1)) fire('su-10', `${sm.name} · Stand up soon`, 'Stand up is in about ten minutes.')
    if (inMinuteWindow(du, -5, 2, 1)) fire('su-5', `${sm.name} · Stand up`, 'Five minutes until stand up.')
    if (inMinuteWindow(du, -1, 1, 1)) fire('su-1', `${sm.name} · Stand up`, 'One minute until stand up.')
    if (du >= 0 && du <= 4) fire('su-0', `${sm.name} · Stand up`, 'Time for stand up — open poco when you are ready.')
  }

  if (!sess.standDownLive) {
    if (inMinuteWindow(dd, -30, 2, 2)) fire('sd-30', `${sm.name} · Stand down`, 'Stand down soon — start your end-of-day review.')
    if (inMinuteWindow(dd, -15, 2, 2)) fire('sd-15', `${sm.name} · Stand down`, 'Fifteen minutes until stand down.')
    if (inMinuteWindow(dd, -5, 2, 1)) fire('sd-5', `${sm.name} · Stand down`, 'Five minutes until stand down.')
    if (inMinuteWindow(dd, -1, 1, 1)) fire('sd-1', `${sm.name} · Stand down`, 'One minute until stand down.')
    if (dd >= 0 && dd <= 4) fire('sd-0', `${sm.name} · Stand down`, 'Time for stand down — review planned vs shipped today.')
  }

  if (du >= 1 && du <= 6 && sess.standUpLive) fire('su-after1', `${sm.name} · Stand up`, 'Refine today’s commitments while context is fresh.')
  if (dd >= 1 && dd <= 6 && sess.standDownLive) fire('sd-after1', `${sm.name} · Stand down`, 'Log carry-overs and extra completions from today.')
}

/** Local reminders for stand up / stand down (deduped per calendar day). */
export function useScrumNotifications(sm: ScrumMasterSettings) {
  useEffect(() => {
    if (!sm.enabled) return
    runScrumNotificationTick(sm)
    const id = window.setInterval(() => runScrumNotificationTick(sm), 10_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') runScrumNotificationTick(sm)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [sm])
}

export async function requestScrumNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const r = await Notification.requestPermission()
    return r === 'granted'
  } catch {
    return false
  }
}
