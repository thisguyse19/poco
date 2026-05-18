import { toLocalISODate } from '../services/storage'
import type { Priority, ScheduledFor } from '../types'

export type NlpPreviewChip = { label: string; kind: 'category' | 'date' | 'time' | 'schedule' }

export type NlpResult = {
  title: string
  category?: string
  dueDate?: string | null
  dueTime?: string | null
  scheduledFor?: ScheduledFor
  priority?: Priority
  chips: NlpPreviewChip[]
}

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

function parseMonthDay(s: string): { month: string; day: string } | null {
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      return { month: String(a).padStart(2, '0'), day: String(b).padStart(2, '0') }
    }
  }
  return null
}

function parseNamedDate(lower: string): string | null {
  const today = new Date()
  if (/\btoday\b/.test(lower)) return toLocalISODate(today)
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return toLocalISODate(d)
  }
  if (/\bnext week\b/.test(lower)) {
    const d = new Date(today)
    d.setDate(d.getDate() + 7)
    return toLocalISODate(d)
  }
  const m = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/)
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3)]
    if (mo) {
      const y = today.getFullYear()
      const day = String(Number(m[2])).padStart(2, '0')
      return `${y}-${mo}-${day}`
    }
  }
  return null
}

function parseTimeToken(lower: string): string | null {
  let m = lower.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/)
  if (m) {
    let h = Number(m[1])
    const min = Number(m[2])
    const ap = m[3]
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    }
  }
  m = lower.match(/\b(\d{1,2})\s*(am|pm)\b/)
  if (m) {
    let h = Number(m[1])
    if (m[2] === 'pm' && h < 12) h += 12
    if (m[2] === 'am' && h === 12) h = 0
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`
  }
  return null
}

function parseSchedule(lower: string): ScheduledFor | undefined {
  if (/\binbox\b/.test(lower)) return 'inbox'
  if (/\btoday\b/.test(lower)) return 'today'
  if (/\btomorrow\b/.test(lower)) return 'tomorrow'
  if (/\bsomeday\b/.test(lower)) return 'someday'
  return undefined
}

/** Parses quick-add text; title must remain non-empty after stripping */
export function parseQuickAdd(raw: string): NlpResult {
  let s = raw.trim()
  const chips: NlpPreviewChip[] = []
  let category: string | undefined
  let dueDate: string | null | undefined
  let dueTime: string | null | undefined
  let scheduledFor: ScheduledFor | undefined
  let priority: Priority | undefined

  const catMatch = s.match(/@([^\s@]+)/)
  if (catMatch) {
    category = catMatch[1].replace(/_/g, ' ')
    chips.push({ label: `@${catMatch[1]}`, kind: 'category' })
    s = s.replace(catMatch[0], ' ').trim()
  }

  const lower = s.toLowerCase()
  const sch = parseSchedule(lower)
  if (sch) {
    scheduledFor = sch
    chips.push({ label: sch, kind: 'schedule' })
    s = s.replace(/\b(inbox|today|tomorrow|someday)\b/gi, ' ').trim()
  }

  const pr =
    /\b(!important|urgent|high)\b/i.test(lower) ? 'high' : /\blow\b/i.test(lower) ? 'low' : undefined
  if (pr) {
    priority = pr
    chips.push({ label: pr, kind: 'schedule' })
    s = s.replace(/\b(!important|urgent|high|low)\b/gi, ' ').trim()
  }

  const t = parseTimeToken(lower)
  if (t) {
    dueTime = t
    chips.push({ label: t, kind: 'time' })
    s = s.replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, ' ')
      .replace(/\b\d{1,2}\s*(am|pm)\b/gi, ' ')
      .trim()
  }

  let d = parseNamedDate(lower)
  if (!d) {
    const md = parseMonthDay(lower)
    if (md) {
      const y = new Date().getFullYear()
      d = `${y}-${md.month}-${md.day}`
    }
  }
  if (d) {
    dueDate = d
    chips.push({ label: d, kind: 'date' })
    s = s.replace(/\btoday\b/gi, ' ')
      .replace(/\btomorrow\b/gi, ' ')
      .replace(/\bnext week\b/gi, ' ')
      .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/gi, ' ')
      .replace(/\d{1,2}[/-]\d{1,2}/g, ' ')
      .trim()
  }

  const title = s.replace(/\s+/g, ' ').trim()
  return { title, category, dueDate, dueTime, scheduledFor, priority, chips }
}
