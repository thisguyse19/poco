import { POCO_LOCALE } from './pocoLocale'

/** Formats due date/time for task rows and detail preview (UK locale, 12h clock). */
export function formatTaskDueDisplay(dueDate?: string | null, dueTime?: string | null): string {
  if (!dueDate && !dueTime) return ''
  if (dueDate && !dueTime) {
    const [y, m, d] = dueDate.split('-').map(Number)
    if (!y || !m || !d) return dueDate
    const dt = new Date(y, m - 1, d)
    return dt.toLocaleDateString(POCO_LOCALE, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }
  if (dueTime) {
    const [hh, mm] = dueTime.split(':').map(Number)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return dueTime
    const d = new Date()
    d.setHours(hh, mm, 0, 0)
    const t = d.toLocaleTimeString(POCO_LOCALE, { hour: 'numeric', minute: '2-digit' })
    if (dueDate) {
      const [y, m, day] = dueDate.split('-').map(Number)
      if (y && m && day) {
        const dt = new Date(y, m - 1, day)
        const datePart = dt.toLocaleDateString(POCO_LOCALE, { month: 'short', day: 'numeric' })
        return `${datePart} · ${t}`
      }
    }
    return t
  }
  return ''
}
