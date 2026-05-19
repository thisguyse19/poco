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
    if (du === -10) fire('su-10', `${sm.name} · Stand up soon`, 'Stand up is in about ten minutes.')
    if (du === -5) fire('su-5', `${sm.name} · Stand up`, 'Five minutes until stand up.')
    if (du === -1) fire('su-1', `${sm.name} · Stand up`, 'One minute until stand up.')
    if (du === 0) fire('su-0', `${sm.name} · Stand up`, 'Time for stand up — open poco when you are ready.')
  }

  if (!sess.standDownLive) {
    if (dd === -30) fire('sd-30', `${sm.name} · Stand down`, 'Stand down starts in thirty minutes — start winding down.')
    if (dd === -15) fire('sd-15', `${sm.name} · Stand down`, 'Fifteen minutes until stand down.')
    if (dd === -5) fire('sd-5', `${sm.name} · Stand down`, 'Five minutes until stand down.')
    if (dd === -1) fire('sd-1', `${sm.name} · Stand down`, 'One minute until stand down.')
    if (dd === 0) fire('sd-0', `${sm.name} · Stand down`, 'Time for stand down — capture what shipped today.')
  }

  if (du === 1 && sess.standUpLive) fire('su-after1', `${sm.name} · Stand up`, 'How is your list shaping up? You can still refine it.')
  if (dd === 1 && sess.standDownLive) fire('sd-after1', `${sm.name} · Stand down`, 'Note carry-overs while they are still fresh.')
}

/** Local reminders for stand up / stand down (deduped per calendar day). Polls often enough to hit minute boundaries. */
export function useScrumNotifications(sm: ScrumMasterSettings, gateComplete: boolean) {
  useEffect(() => {
    if (!sm.enabled || !gateComplete) return
    runScrumNotificationTick(sm)
    const id = window.setInterval(() => runScrumNotificationTick(sm), 12_000)
    return () => window.clearInterval(id)
  }, [sm, gateComplete])
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
