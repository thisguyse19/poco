import { toLocalISODate } from '../services/storage'
import type { Priority, ScheduledFor } from '../types'

export type NlpPreviewChip = {
  label: string
  kind: 'category' | 'date' | 'time' | 'schedule' | 'priority'
}

export type NlpResult = {
  title: string
  category?: string
  dueDate?: string | null
  dueTime?: string | null
  scheduledFor?: ScheduledFor
  priority?: Priority
  chips: NlpPreviewChip[]
}

const MONTH_MAP: Record<string, string> = {
  january: '01',
  jan: '01',
  february: '02',
  feb: '02',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  may: '05',
  june: '06',
  jun: '06',
  july: '07',
  jul: '07',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  sept: '09',
  october: '10',
  oct: '10',
  november: '11',
  nov: '11',
  december: '12',
  dec: '12',
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function monthToNum(word: string): string | null {
  const k = word.toLowerCase().replace(/\.$/, '')
  return MONTH_MAP[k] ?? MONTH_MAP[k.slice(0, 3)] ?? null
}

function resolveYearForDate(monthNum: string, day: number): number {
  const y = new Date().getFullYear()
  const candidate = new Date(y, Number(monthNum) - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (candidate < today) return y + 1
  return y
}

function toHHmm(hour: number, minute: number, ap?: string): string | null {
  let h = hour
  const m = minute
  if (ap) {
    const a = ap.toLowerCase()
    if (a === 'pm' && h < 12) h += 12
    if (a === 'am' && h === 12) h = 0
  }
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${pad2(h)}:${pad2(m)}`
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

  const endCat = s.match(/\s@([^\s@]+)\s*$/i)
  if (endCat && endCat.index !== undefined) {
    category = endCat[1].replace(/_/g, ' ')
    chips.push({ label: `@${endCat[1]}`, kind: 'category' })
    s = s.slice(0, endCat.index).trim()
  } else {
    const anyCat = s.match(/@([^\s@]+)/)
    if (anyCat && anyCat.index !== undefined) {
      category = anyCat[1].replace(/_/g, ' ')
      chips.push({ label: `@${anyCat[1]}`, kind: 'category' })
      s = (s.slice(0, anyCat.index) + s.slice(anyCat.index + anyCat[0].length)).replace(/\s+/g, ' ').trim()
    }
  }

  const onDayMonthAt = s.match(
    /\s+on\s+(\d{1,2})\s+([a-z]+)\.?\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  )
  const onMonthDayAt = s.match(
    /\s+on\s+([a-z]+)\.?\s+(\d{1,2})\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  )

  if (onDayMonthAt && onDayMonthAt.index !== undefined) {
    const day = Number(onDayMonthAt[1])
    const mo = monthToNum(onDayMonthAt[2])
    const hh = Number(onDayMonthAt[3])
    const mm = onDayMonthAt[4] ? Number(onDayMonthAt[4]) : 0
    const ap = onDayMonthAt[5]
    if (mo && day >= 1 && day <= 31) {
      const y = resolveYearForDate(mo, day)
      dueDate = `${y}-${mo}-${pad2(day)}`
      const t = toHHmm(hh, mm, ap)
      if (t) {
        dueTime = t
        chips.push({ label: `${day} ${onDayMonthAt[2]} · ${t}`, kind: 'date' })
      } else {
        chips.push({ label: dueDate, kind: 'date' })
      }
      s = (s.slice(0, onDayMonthAt.index) + s.slice(onDayMonthAt.index + onDayMonthAt[0].length))
        .replace(/\s+/g, ' ')
        .trim()
    }
  } else if (onMonthDayAt && onMonthDayAt.index !== undefined) {
    const mo = monthToNum(onMonthDayAt[1])
    const day = Number(onMonthDayAt[2])
    const hh = Number(onMonthDayAt[3])
    const mm = onMonthDayAt[4] ? Number(onMonthDayAt[4]) : 0
    const ap = onMonthDayAt[5]
    if (mo && day >= 1 && day <= 31) {
      const y = resolveYearForDate(mo, day)
      dueDate = `${y}-${mo}-${pad2(day)}`
      const t = toHHmm(hh, mm, ap)
      if (t) {
        dueTime = t
        chips.push({ label: `${onMonthDayAt[1]} ${day} · ${t}`, kind: 'date' })
      } else {
        chips.push({ label: dueDate, kind: 'date' })
      }
      s = (s.slice(0, onMonthDayAt.index) + s.slice(onMonthDayAt.index + onMonthDayAt[0].length))
        .replace(/\s+/g, ' ')
        .trim()
    }
  }

  const lower2 = s.toLowerCase()

  const sch = parseSchedule(lower2)
  if (sch) {
    scheduledFor = sch
    chips.push({ label: sch, kind: 'schedule' })
    s = s.replace(/\b(inbox|today|tomorrow|someday)\b/gi, ' ').trim()
  }

  const pr =
    /\b(!important|urgent|high)\b/i.test(lower2) ? 'high' : /\blow\b/i.test(lower2) ? 'low' : undefined
  if (pr) {
    priority = pr
    chips.push({ label: pr, kind: 'priority' })
    s = s.replace(/\b(!important|urgent|high|low)\b/gi, ' ').trim()
  }

  const t = parseTimeToken(s.toLowerCase())
  if (t && !dueTime) {
    dueTime = t
    chips.push({ label: t, kind: 'time' })
    s = s
      .replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, ' ')
      .replace(/\b\d{1,2}\s*(am|pm)\b/gi, ' ')
      .trim()
  }

  let d = parseNamedDate(s.toLowerCase())
  if (!d && !dueDate) {
    const md = parseMonthDay(s)
    if (md) {
      const y = new Date().getFullYear()
      d = `${y}-${md.month}-${md.day}`
    }
  }
  if (d && !dueDate) {
    dueDate = d
    chips.push({ label: d, kind: 'date' })
    s = s
      .replace(/\btoday\b/gi, ' ')
      .replace(/\btomorrow\b/gi, ' ')
      .replace(/\bnext week\b/gi, ' ')
      .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/gi, ' ')
      .replace(/\d{1,2}[/-]\d{1,2}/g, ' ')
      .trim()
  }

  const title = s.replace(/\s+/g, ' ').trim()
  return { title, category, dueDate, dueTime, scheduledFor, priority, chips }
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
    const mo = MONTH_MAP[m[1].slice(0, 3)]
    if (mo) {
      const y = new Date().getFullYear()
      const day = String(Number(m[2])).padStart(2, '0')
      return `${y}-${mo}-${day}`
    }
  }
  return null
}

function parseTimeToken(lower: string): string | null {
  let m = lower.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/)
  if (m) {
    const h = Number(m[1])
    const min = Number(m[2])
    const ap = m[3]
    return toHHmm(h, min, ap) ?? null
  }
  m = lower.match(/\b(\d{1,2})\s*(am|pm)\b/)
  if (m) {
    const h = Number(m[1])
    return toHHmm(h, 0, m[2]) ?? null
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
