import type { ScrumMasterGender, ScrumMasterPersonality, ScrumMasterSettings } from '../types'

export const SCRUM_MASTER_CATEGORY = 'Scrum Master'

export const SCRUM_MASTER_PERSONALITIES: {
  id: ScrumMasterPersonality
  title: string
  hint: string
}[] = [
  { id: 'warm', title: 'Warm', hint: 'Soft encouragement and gentle pacing' },
  { id: 'coach', title: 'Coach', hint: 'Clear structure and small next steps' },
  { id: 'minimal', title: 'Quiet', hint: 'Short lines, little flourish' },
  { id: 'playful', title: 'Playful', hint: 'Light metaphors and energy' },
  { id: 'stern', title: 'Direct', hint: 'Crisp, no-nonsense prompts' },
]

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
      /**
       * Signed offset in whole minutes: `nowMinutes - eventMinutes`.
       * Negative = before the scheduled time, zero = this minute, positive = after.
       */
      deltaMinutes: number
    }

/** Stand up: 5 min before through 10 min after. Stand down: 30 min before through 10 min after. */
export function getScrumBanner(sm: ScrumMasterSettings, d = new Date()): ScrumBannerView {
  if (!sm.enabled) return { visible: false }
  const n = nowMinutes(d)
  const tu = timeToMinutes(sm.standUpTime)
  const td = timeToMinutes(sm.standDownTime)

  const inUp = n >= tu - 5 && n <= tu + 10
  const inDown = n >= td - 30 && n <= td + 10
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

function pSuffix(p: ScrumMasterPersonality, lines: Record<ScrumMasterPersonality, string>): string {
  return lines[p] ?? ''
}

/** Banner body line: `deltaMinutes` is `now - event` in whole minutes. */
export function buildScrumBannerLine(kind: ScrumBannerKind, deltaMinutes: number, personality: ScrumMasterPersonality): string {
  const isUp = kind === 'standUp'
  const event = isUp ? 'stand up' : 'stand down'
  const Event = isUp ? 'Stand up' : 'Stand down'
  const dm = deltaMinutes

  if (dm < 0) {
    const m = Math.abs(dm)
    const tap = ' Tap here to start when you are ready.'
    if (m === 1) {
      return `${Event} starts in one minute.${pSuffix(personality, {
        warm: " I'll be right here.",
        coach: " Let's line up your intentions.",
        minimal: '',
        playful: ' Deep breath — then we roll.',
        stern: ' Be on time.',
      })}`
    }
    if (m <= 5) {
      return `${m} minute${m === 1 ? '' : 's'} until your ${event}.${tap}${pSuffix(personality, {
        warm: '',
        coach: ' Keep scope tight.',
        minimal: '',
        playful: ' Almost showtime.',
        stern: '',
      })}`
    }
    if (m <= 15) {
      return `${m} minutes until your ${event}.${tap}${pSuffix(personality, {
        warm: ' No rush — just gathering.',
        coach: ' Preview your top outcomes.',
        minimal: `${m} min to ${event}.`,
        playful: ' The day is warming up.',
        stern: `${m} minutes. Prepare.`,
      })}`
    }
    if (m <= 29) {
      return `${m} minutes until your ${event}.${pSuffix(personality, {
        warm: ` ${Event} is coming up soon.`,
        coach: ' Block distractions early.',
        minimal: '',
        playful: ' Coffee window closing soon.',
        stern: ` ${m} minutes out.`,
      })}`
    }
    return `${m} minutes until your ${event}.${pSuffix(personality, {
      warm: ' Plenty of runway — I will nudge you closer in.',
      coach: ' Use the time to clear your desk mentally.',
      minimal: `${m} min to ${event}.`,
      playful: ' Still in the green room.',
      stern: ` ${Event} in ${m} minutes.`,
    })}`
  }

  if (dm === 0) {
    return `Time for your ${event}.${pSuffix(personality, {
      warm: ' Tap here whenever you are ready — I will stay with you.',
      coach: ' Tap to open the flow and name your top focus.',
      minimal: ' Tap to start.',
      playful: ' Tap — let us make today feel doable.',
      stern: ' Tap to begin now.',
    })}`
  }

  const after = dm
  if (after === 1) {
    return `${Event} has just begun.${pSuffix(personality, {
      warm: ' Tap to keep going in the flow.',
      coach: ' Capture commitments while they are fresh.',
      minimal: ' In progress.',
      playful: ' Momentum mode: on.',
      stern: ' Stay on task.',
    })}`
  }
  if (after <= 5) {
    return `${after} minute${after === 1 ? '' : 's'} into your ${event}. Tap to open the flow.${pSuffix(personality, {
      warm: '',
      coach: ' Adjust if priorities shifted.',
      minimal: '',
      playful: '',
      stern: '',
    })}`
  }
  return `${after} minutes into your ${event}. Tap to open the flow.${pSuffix(personality, {
    warm: ' Still time to refine your list.',
    coach: ' Check that nothing critical slipped.',
    minimal: '',
    playful: ' Mid-session tune-up?',
    stern: ' Close the loop before the window ends.',
  })}`
}

export function scrumLiveSubtitle(personality: ScrumMasterPersonality, standUp: boolean): string {
  if (standUp) {
    return pSuffix(personality, {
      warm: 'Add what you intend to finish — I will keep it visible today.',
      coach: 'Name outcomes, not busywork. One line per commitment is enough.',
      minimal: 'Today’s commitments.',
      playful: 'Toss tasks in like ideas on sticky notes — we will sort later.',
      stern: 'List what must ship today. Drop the rest.',
    })
  }
  return pSuffix(personality, {
    warm: 'Celebrate small wins, then park what can wait.',
    coach: 'Mark done, note carry-over, and leave one clear start for tomorrow.',
    minimal: 'Wrap-up and carry-over.',
    playful: 'Close the loops so your brain can clock out.',
    stern: 'Account for what shipped. Move the rest deliberately.',
  })
}
