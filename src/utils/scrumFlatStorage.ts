function storageKey(day: string) {
  return `poco:scrum-flat:${day}`
}

/** Persist “gather into SM section” for a calendar day (writes `0` = gathered). */
export function writeScrumFlatPreference(day: string, flat: boolean) {
  localStorage.setItem(storageKey(day), flat ? '1' : '0')
}
