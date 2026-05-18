import type { ScrumMasterGender, ScrumMasterSettings } from '../types'

export const SCRUM_MASTER_CATEGORY = 'Scrum Master'

export const SCRUM_MALE_NAMES = [
  'Alex',
  'Jordan',
  'Riley',
  'Casey',
  'Morgan',
  'Sam',
  'Blake',
  'Drew',
  'Jesse',
  'Quinn',
  'Taylor',
  'Avery',
  'Jamie',
  'Reese',
  'Skyler',
] as const

export const SCRUM_FEMALE_NAMES = [
  'Maya',
  'Zoe',
  'Nora',
  'Elena',
  'Priya',
  'Sofia',
  'Olivia',
  'Emma',
  'Ava',
  'Mia',
  'Luna',
  'Ivy',
  'Clara',
  'Rosa',
  'Helen',
] as const

export function scrumNamesForGender(g: ScrumMasterGender): readonly string[] {
  return g === 'male' ? SCRUM_MALE_NAMES : SCRUM_FEMALE_NAMES
}

export function normalizeTimeHHMM(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return '09:00'
  let h = Number(m[1])
  let min = Number(m[2])
  if (Number.isNaN(h) || Number.isNaN(min)) return '09:00'
  h = Math.min(23, Math.max(0, h))
  min = Math.min(59, Math.max(0, min))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function timeToMinutes(hhmm: string): number {
  const [a, b] = normalizeTimeHHMM(hhmm).split(':').map(Number)
  return a * 60 + b
}

export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes()
}

export type ScrumBannerKind = 'standUp' | 'standDown'

export type ScrumBannerView =
  | { visible: false }
  | {
      visible: true
      kind: ScrumBannerKind
      /** Minutes until the event (negative if we are after, for "started" copy) */
      deltaMinutes: number
    }

/** ±5 min before, at, up to +10 min after scheduled stand up / stand down */
export function getScrumBanner(sm: ScrumMasterSettings, d = new Date()): ScrumBannerView {
  if (!sm.enabled) return { visible: false }
  const n = nowMinutes(d)
  const tu = timeToMinutes(sm.standUpTime)
  const td = timeToMinutes(sm.standDownTime)

  const inUp = n >= tu - 5 && n <= tu + 10
  const inDown = n >= td - 5 && n <= td + 10
  if (inUp && inDown) {
    const du = Math.abs(n - tu)
    const dd = Math.abs(n - td)
    return du <= dd ? bannerFor('standUp', n, tu) : bannerFor('standDown', n, td)
  }
  if (inUp) return bannerFor('standUp', n, tu)
  if (inDown) return bannerFor('standDown', n, td)
  return { visible: false }
}

function bannerFor(kind: ScrumBannerKind, n: number, t: number): ScrumBannerView {
  return { visible: true, kind, deltaMinutes: n - t }
}

export function isStandUpCollectionWindow(sm: ScrumMasterSettings, d = new Date()): boolean {
  if (!sm.enabled) return false
  const n = nowMinutes(d)
  const tu = timeToMinutes(sm.standUpTime)
  return n >= tu && n < tu + 60
}

export function isStandDownCollectionWindow(sm: ScrumMasterSettings, d = new Date()): boolean {
  if (!sm.enabled) return false
  const n = nowMinutes(d)
  const td = timeToMinutes(sm.standDownTime)
  return n >= td - 30 && n < td + 60
}

export function isScrumInlinePhase(sm: ScrumMasterSettings, d = new Date()): boolean {
  if (!sm.enabled) return false
  const n = nowMinutes(d)
  const tu = timeToMinutes(sm.standUpTime)
  if (n < tu + 60) return false
  if (isStandUpCollectionWindow(sm, d)) return false
  if (isStandDownCollectionWindow(sm, d)) return false
  if (getScrumBanner(sm, d).visible) return false
  return true
}
