import { POCO_LOCALE } from './pocoLocale'

/** Format YYYY-MM-DD as d mmm yyyy (e.g. 5 May 2026), UK English. */
export function formatIsoAsDMmmYyyy(iso: string) {
  const [y, m, d] = iso.split('-').map((x) => x.trim())
  if (!y || !m || !d) return ''
  const day = String(Number(d))
  const mon = new Date(2000, Number(m) - 1, 1).toLocaleDateString(POCO_LOCALE, { month: 'short' })
  return `${day} ${mon} ${y}`
}

/** e.g. 12 May 2026 */
export function formatIsoAsUkLong(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (Number.isNaN(dt.getTime())) return iso
  return new Intl.DateTimeFormat(POCO_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dt)
}

/** Column header: Mon 12 May */
export function formatIsoWeekdayShortUk(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (Number.isNaN(dt.getTime())) return iso
  return new Intl.DateTimeFormat(POCO_LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(dt)
}

/** Range line for week strip, e.g. 12–18 May 2026 */
export function formatIsoWeekRangeUk(startIso: string, endIso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) return ''
  const [y1, m1, d1] = startIso.split('-').map(Number)
  const [y2, m2, d2] = endIso.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1)
  const b = new Date(y2, m2 - 1, d2)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ''
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  if (sameMonth) {
    const mon = new Intl.DateTimeFormat(POCO_LOCALE, { month: 'long', year: 'numeric' }).format(a)
    return `${a.getDate()}\u2013${b.getDate()} ${mon}`
  }
  const left = new Intl.DateTimeFormat(POCO_LOCALE, { day: 'numeric', month: 'short' }).format(a)
  const right = new Intl.DateTimeFormat(POCO_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(b)
  return `${left}\u2013${right}`
}
