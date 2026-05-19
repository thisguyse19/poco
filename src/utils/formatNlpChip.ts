import { POCO_LOCALE } from './pocoLocale'

/** Formats YYYY-MM-DD for NLP preview chips (e.g. "9 July 2001"), UK English. */
export function formatNlpDateChipLabel(iso: string): string {
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

/** Renders a date-kind chip label, preserving a trailing " · time" segment if present. */
export function formatNlpDateChipDisplay(label: string, dueDate: string | null | undefined): string {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return label
  const sep = '·'
  if (label.includes(sep)) {
    const rest = label.split(sep).slice(1).join(sep).trim()
    const datePart = formatNlpDateChipLabel(dueDate)
    return rest ? `${datePart} · ${rest}` : datePart
  }
  return formatNlpDateChipLabel(dueDate)
}
