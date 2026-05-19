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

export type ScrumBannerScheduleKind = 'standUp' | 'standDown'

export type ScrumBannerView =
  | { visible: false }
  | {
      visible: true
      kind: ScrumBannerScheduleKind
      /**
       * Signed offset in whole minutes: `nowMinutes - eventMinutes`.
       * Negative = before the scheduled time, zero = this minute, positive = after.
       */
      deltaMinutes: number
    }
  | { visible: true; kind: 'farewellUp' | 'farewellDown' }

/** @deprecated use ScrumBannerScheduleKind */
export type ScrumBannerKind = ScrumBannerScheduleKind

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

function bannerFor(kind: ScrumBannerScheduleKind, n: number, t: number): ScrumBannerView {
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

/** Stand-down: end-of-day review vs stand-up plan + extra completions (Agile). */
function buildStandDownScheduleLine(dm: number, personality: ScrumMasterPersonality): string {
  const tap = ' Tap here to open the review flow.'
  if (dm < 0) {
    const m = Math.abs(dm)
    if (m === 1) {
      return `Stand down starts in one minute — time to prep your “done vs planned” recap.${pSuffix(personality, {
        warm: ' You have done more than you think.',
        coach: ' Gather completions before the bell.',
        minimal: '',
        playful: ' Almost retro o’clock.',
        stern: ' Be ready.',
      })}`
    }
    if (m <= 5) {
      return `${m} minutes until stand down.${tap}${pSuffix(personality, {
        warm: ' We will look at what you committed at stand up.',
        coach: ' Line up shipped work vs this morning’s plan.',
        minimal: `${m} min to review.`,
        playful: ' Scoreboard time.',
        stern: '',
      })}`
    }
    if (m <= 15) {
      return `${m} minutes until stand down — end-of-day review.${pSuffix(personality, {
        warm: ' Planned vs done, plus anything extra you finished.',
        coach: ' Note scope that slipped so tomorrow is honest.',
        minimal: '',
        playful: ' Sprint day closing chapter.',
        stern: ` ${m} minutes.`,
      })}`
    }
    if (m <= 29) {
      return `${m} minutes until stand down.${pSuffix(personality, {
        warm: ' You will reconcile what you promised at stand up with what shipped.',
        coach: ' Think shipped, carry-over, and surprises.',
        minimal: '',
        playful: '',
        stern: '',
      })}`
    }
    return `${m} minutes until stand down — your daily sprint review.${pSuffix(personality, {
      warm: ' Plenty of time to mentally stack wins and misses.',
      coach: ' Capture evidence of done work while memory is fresh.',
      minimal: `${m} min to stand down.`,
      playful: '',
      stern: '',
    })}`
  }
  if (dm === 0) {
    return `Time for stand down — review what completed today against this morning’s plan.${pSuffix(personality, {
      warm: ' Include bonus tasks you finished that were not on the original list.',
      coach: ' Mark done, log carry-over, name one improvement for tomorrow’s sprint day.',
      minimal: ' Tap to start.',
      playful: ' Retro hat on — tap when ready.',
      stern: ' Tap to begin the review.',
    })}`
  }
  const after = dm
  if (after === 1) {
    return `Stand down is open — walk your board: planned commitments, then extras you shipped.${pSuffix(personality, {
      warm: '',
      coach: '',
      minimal: '',
      playful: '',
      stern: '',
    })}`
  }
  if (after <= 5) {
    return `${after} minute${after === 1 ? '' : 's'} into stand down. Check off what landed today.${pSuffix(personality, {
      warm: '',
      coach: ' Compare to your stand-up snapshot.',
      minimal: '',
      playful: '',
      stern: '',
    })}`
  }
  return `${after} minutes into stand down. Close the loop on today’s sprint slice.${pSuffix(personality, {
    warm: '',
    coach: '',
    minimal: '',
    playful: '',
    stern: '',
  })}`
}

/** Banner body for scheduled stand up / stand down (not farewell). */
export function buildScrumBannerLine(
  kind: ScrumBannerScheduleKind,
  deltaMinutes: number,
  personality: ScrumMasterPersonality,
): string {
  if (kind === 'standDown') return buildStandDownScheduleLine(deltaMinutes, personality)

  const event = 'stand up'
  const Event = 'Stand up'
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

export function buildFarewellBannerLine(kind: 'farewellUp' | 'farewellDown', personality: ScrumMasterPersonality): string {
  if (kind === 'farewellUp') {
    return pSuffix(personality, {
      warm: 'Have a calm, productive day. I will meet you at stand down to review what shipped versus this morning’s plan.',
      coach: 'Ship with intent — capture outcomes as you go so stand down is quick and honest.',
      minimal: 'Have a good day.',
      playful: 'You have got this sprint day — I will bring the retro energy later.',
      stern: 'Execute. We reconcile at stand down.',
    })
  }
  return pSuffix(personality, {
    warm: 'Rest well — tomorrow is a fresh sprint day. I will see you at stand up.',
    coach: 'Close the laptop with a clear picture of done vs carry-over. See you tomorrow.',
    minimal: 'See you tomorrow.',
    playful: 'That is a wrap on today’s episode — same time tomorrow?',
    stern: 'Day closed. Be back on time tomorrow.',
  })
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
    warm: 'Tick off what completed today against your stand-up plan — note extras you finished and what carries forward.',
    coach: 'Sprint review: planned vs done, blockers, carry-over. Log it while it is fresh.',
    minimal: 'Planned vs shipped today.',
    playful: 'Retro mode: wins, surprises, and honest carry-overs.',
    stern: 'Account for every commitment from stand up. Move unfinished work deliberately.',
  })
}
