import { toLocalISODate } from '../services/storage'
import { isScrumInlinePhase } from './scrumMaster'
import type { ScrumMasterSettings } from '../types'

function storageKey(day: string) {
  return `poco:scrum-flat:${day}`
}

/** false = user gathered tasks into Scrum Master category; null = follow automatic inline phase */
export function readScrumFlatPreference(day: string): boolean | null {
  const v = localStorage.getItem(storageKey(day))
  if (v === '0') return false
  if (v === '1') return true
  return null
}

export function writeScrumFlatPreference(day: string, flat: boolean) {
  localStorage.setItem(storageKey(day), flat ? '1' : '0')
}

export function effectiveScrumFlatToday(sm: ScrumMasterSettings, d = new Date()): boolean {
  const day = toLocalISODate(d)
  const pref = readScrumFlatPreference(day)
  if (pref === false) return false
  if (pref === true) return true
  return isScrumInlinePhase(sm, d)
}
