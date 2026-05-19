import { useEffect } from 'react'
import type { ScrumMasterSettings } from '../types'
import { toLocalISODate } from '../services/storage'
import { getScrumSession } from '../utils/scrumSession'
import { nowMinutes, scrumNotifyPayload, timeToMinutes, type ScrumNotifyBodyKey } from '../utils/scrumMaster'

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

  const fire = (key: ScrumNotifyBodyKey) => {
    if (!markSent(day, key)) return
    const { title, body } = scrumNotifyPayload(key, sm.name, sm.personality)
    try {
      new Notification(title, { body, tag: `poco-sm-${key}`, silent: false })
    } catch {
      /* ignore */
    }
  }

  const du = n - tu
  const dd = n - td

  if (!sess.standUpLive) {
    if (inMinuteWindow(du, -10, 2, 1)) fire('su-10')
    if (inMinuteWindow(du, -5, 2, 1)) fire('su-5')
    if (inMinuteWindow(du, -1, 1, 1)) fire('su-1')
    if (du >= 0 && du <= 4) fire('su-0')
  }

  if (!sess.standDownLive) {
    if (inMinuteWindow(dd, -30, 2, 2)) fire('sd-30')
    if (inMinuteWindow(dd, -15, 2, 2)) fire('sd-15')
    if (inMinuteWindow(dd, -5, 2, 1)) fire('sd-5')
    if (inMinuteWindow(dd, -1, 1, 1)) fire('sd-1')
    if (dd >= 0 && dd <= 4) fire('sd-0')
  }

  if (du >= 1 && du <= 6 && sess.standUpLive) fire('su-after1')
  if (dd >= 1 && dd <= 6 && sess.standDownLive) fire('sd-after1')
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
