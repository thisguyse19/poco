import type { ScrumMasterGender, ScrumMasterPersonality, ScrumMasterSettings, Task } from '../types'
import { toLocalISODate } from '../services/storage'
import type { ScrumSessionState } from './scrumSession'
import { getActiveFarewell } from './scrumSession'

export const SCRUM_MASTER_CATEGORY = 'Scrum Master'

export const SCRUM_MASTER_PERSONALITIES: {
  id: Exclude<ScrumMasterPersonality, 'boldR21' | 'snarkyR21' | 'slayR21'>
  title: string
  hint: string
}[] = [
  { id: 'warm', title: 'Warm', hint: 'Soft encouragement and gentle pacing' },
  { id: 'coach', title: 'Coach', hint: 'Clear structure and small next steps' },
  { id: 'minimal', title: 'Quiet', hint: 'Short lines, little flourish' },
  { id: 'playful', title: 'Playful', hint: 'Sparkly metaphors, cheeky asides, high fives' },
  {
    id: 'snarky',
    title: 'Snarky',
    hint: 'Dry sarcasm and eye-rolls, still sounds like someone who attends the meeting',
  },
  {
    id: 'bold',
    title: 'Bold',
    hint: 'Flirty charm and smolder, PG-13 heat, still safe for the office',
  },
]

export function scrumPersonalityMeta(id: ScrumMasterPersonality): { title: string; hint: string } {
  if (id === 'slayR21') {
    return {
      title: 'Slay R21',
      hint: 'Queer-coded hype: yassss energy, read the room, still safe for work. Text-only spice; be kind to humans.',
    }
  }
  if (id === 'boldR21') {
    return {
      title: 'Bold R21',
      hint: 'Dirty-honest, flirty-blunt copy: hungry verbs, zero “per my last email,” 18+ in tone only.',
    }
  }
  if (id === 'snarkyR21') {
    return {
      title: 'Snarky R21',
      hint: 'Swears on tap, roasts the plan (not your coworkers). Vulgar, never sexual. Allergic to that LinkedIn voice.',
    }
  }
  const row = SCRUM_MASTER_PERSONALITIES.find((p) => p.id === id)
  if (row) return { title: row.title, hint: row.hint }
  return { title: id, hint: '' }
}

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

/**
 * Schedule banner (tap to start live stand-up / stand-down):
 * - Stand-up: 5 minutes before through 10 minutes after `standUpTime`.
 * - Stand-down: 30 minutes before through 10 minutes after `standDownTime`.
 * If both windows overlap, the closer scheduled time wins.
 *
 * Task collection windows (SM category / quick-add behaviour on Home) use separate ranges:
 * - Stand-up collection: from the scheduled stand-up minute through 59 minutes after (`[tu, tu+60)` in minutes).
 * - Stand-down collection: from 30 minutes before stand-down through 59 minutes after (`[td-30, td+60)`).
 */
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

/** Hide schedule banners after the user has already finished that ritual today. */
export function applyScrumScheduleBannerCompletionGuards(
  view: ScrumBannerView,
  session: ScrumSessionState,
  day: string = toLocalISODate(),
): ScrumBannerView {
  if (!view.visible) return view
  if (view.kind === 'farewellUp' || view.kind === 'farewellDown') return view
  if (view.kind === 'standUp' && session.standUpPlan?.date === day) return { visible: false }
  if (view.kind === 'standDown' && session.standDownCompletedDate === day) return { visible: false }
  return view
}

/** Stand-up / stand-down windows, live session, or farewell (when the SM category header is shown). */
export function isScrumMasterRhythmActive(
  sm: ScrumMasterSettings,
  session: ScrumSessionState,
  d = new Date(),
): boolean {
  if (!sm.enabled) return false
  if (session.standUpLive || session.standDownLive) return true
  if (getActiveFarewell(session)) return true
  if (isStandUpCollectionWindow(sm, d) || isStandDownCollectionWindow(sm, d)) return true
  return applyScrumScheduleBannerCompletionGuards(getScrumBanner(sm, d), session, toLocalISODate(d)).visible === true
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

/** Every personality gets a full line; `slayR21` reuses playful lines with extra read layered in personaLine. */
type PersonalityLinesAll = { [K in Exclude<ScrumMasterPersonality, 'slayR21'>]: string }

const SLAY_READ = ' Yassss serve the sprint, shade the fluff, never shade coworkers.'

function personaLine(personality: ScrumMasterPersonality, lines: PersonalityLinesAll): string {
  if (personality === 'slayR21') {
    return `${lines.playful}${SLAY_READ}`
  }
  return lines[personality as keyof PersonalityLinesAll]
}

/** Stand-down: end-of-day review vs stand-up plan + extra completions (Agile). */
function buildStandDownScheduleLine(dm: number, personality: ScrumMasterPersonality): string {
  const tap = ' Tap here to open the review flow.'
  if (dm < 0) {
    const m = Math.abs(dm)
    if (m === 1) {
      return personaLine(personality, {
        warm: 'Stand down starts in one minute. Time to prep your “done vs planned” recap. You have done more than you think.',
        coach:
          'Stand down starts in one minute. Time to prep your “done vs planned” recap. Gather completions before the bell.',
        minimal: 'Stand down in 1 min. Prep done vs planned.',
        playful:
          'Stand down starts in one minute. Time to prep your “done vs planned” recap. One minute until the end-of-day boss battle (it is friendly, promise).',
        snarky: 'Stand down starts in one minute. Time to prep your “done vs planned” recap. Be ready.',
        bold: 'Stand down starts in one minute. Time to prep your “done vs planned” recap. Sixty seconds, line up proof before we compare notes.',
        boldR21:
          'One minute until stand down, strip the polite version, stack what you actually shipped, and say it like you mean it in the dark. 18+ copy only; consent still matters with real people.',
        snarkyR21:
          'Stand down in sixty fucking seconds, prep your “done vs planned” recap like an adult, not a LinkedIn poet. Nothing sexual here, just ugly truth and a shorter fuse.',
      })
    }
    if (m <= 5) {
      return personaLine(personality, {
        warm: `${m} minutes until stand down.${tap} We will look at what you committed at stand up.`,
        coach: `${m} minutes until stand down.${tap} Line up shipped work vs this morning’s plan.`,
        minimal: `${m} minutes until stand down.${tap} ${m} min to review.`,
        playful: `${m} minutes until stand down.${tap} Scoreboard time. Chalk up the wins before the buzzer.`,
        snarky: `${m} minutes until stand down.${tap}`,
        bold: `${m} minutes until stand down.${tap} Short runway, make shipped work easy to defend.`,
        boldR21: `${m} minutes until stand down.${tap} Clock’s ticking, get your story straight while it’s still hot enough to blush at. Keep the horny in the wording, not in how you treat coworkers.`,
        snarkyR21: `${m} minutes until stand down.${tap} Quit sandbagging: line up what shipped vs what you promised before I start swearing louder. Crude, not porn, just facts with teeth.`,
      })
    }
    if (m <= 15) {
      return personaLine(personality, {
        warm: `${m} minutes until stand down. End-of-day review. Planned vs done, plus anything extra you finished.`,
        coach: `${m} minutes until stand down. End-of-day review. Note scope that slipped so tomorrow is honest.`,
        minimal: `${m} minutes until stand down. End-of-day review.`,
        playful: `${m} minutes until stand down. End-of-day review. Sprint day finale. Cue the highlight reel.`,
        snarky: `${m} minutes until stand down. End-of-day review. ${m} minutes.`,
        bold: `${m} minutes until stand down. End-of-day review. Buffer time, tomorrow-you reads your receipts.`,
        boldR21: `${m} minutes until stand down, end-of-day review with the gloves off: what moved, what shipped, what you only winked at. Say it blunt, not creepy-weird.`,
        snarkyR21: `${m} minutes until stand down, review time. Planned vs done, plus the shit you “forgot” to mention. Loud, not sexual. Quit faking the busy badge.`,
      })
    }
    if (m <= 29) {
      return personaLine(personality, {
        warm: `${m} minutes until stand down. You will reconcile what you promised at stand up with what shipped.`,
        coach: `${m} minutes until stand down. Think shipped, carry-over, and surprises.`,
        minimal: `${m} minutes until stand down.`,
        playful: `${m} minutes until stand down. Plot twist watch: what quietly shipped while nobody was looking?`,
        snarky: `${m} minutes until stand down.`,
        bold: `${m} minutes until stand down. Plenty of runway, separate motion from proof you would show someone.`,
        boldR21: `${m} minutes until stand down, long runway to admit what you actually moved today. Truth beats the pretty story you told the calendar.`,
        snarkyR21: `${m} minutes until stand down, plenty of time to stop lying to yourself on the record. Vulgar mouth, clean math: what shipped vs what you promised.`,
      })
    }
    return personaLine(personality, {
      warm: `${m} minutes until stand down. Your daily sprint review. Plenty of time to mentally stack wins and misses.`,
      coach: `${m} minutes until stand down. Your daily sprint review. Capture evidence of done work while memory is fresh.`,
      minimal: `${m} minutes until stand down. Your daily sprint review.${m} min to stand down.`,
      playful: `${m} minutes until stand down. Your daily sprint review. Grab confetti for the wins and a sticky note for the “whoops”.`,
      snarky: `${m} minutes until stand down. Your daily sprint review.`,
      bold: `${m} minutes until stand down. Your daily sprint review. Heads-up, stack wins and misses before the clock gets judgy.`,
      boldR21: `${m} minutes until stand down, your daily sprint slice: wins, misses, near misses. Say it flat, say it loud. App copy goes 18+; you stay decent to real humans.`,
      snarkyR21: `${m} minutes until stand down, daily review, no deodorant on the language. Stack wins, flag the bullshit, and don’t you dare confuse “crass” with “sexual.”`,
    })
  }
  if (dm === 0) {
    return personaLine(personality, {
      warm:
        'Time for stand down. Review what completed today against this morning’s plan. Include bonus tasks you finished that were not on the original list.',
      coach:
        'Time for stand down. Review what completed today against this morning’s plan. Mark done, log carry-over, name one improvement for tomorrow’s sprint day.',
      minimal: 'Time for stand down. Review what completed today against this morning’s plan. Tap to start.',
      playful: 'Time for stand down. Review what completed today against this morning’s plan. Retro hat on. Tap when ready.',
      snarky: 'Time for stand down. Review what completed today against this morning’s plan. Tap to begin the review.',
      bold: 'Time for stand down. Review what completed today against this morning’s plan. Tap in, let the numbers tell the straight story.',
      boldR21:
        'Time for stand down, drag today’s truth across the finish line: what you finished, what you dodged, what you’d whisper if nobody was grading you. 18+ tone; behave in real life.',
      snarkyR21:
        'Time for stand down, open the app and reconcile the fucking day: planned vs shipped, no poetry. Not porn, just rude clarity and receipts.',
    })
  }
  const after = dm
  if (after === 1) {
    return personaLine(personality, {
      warm: 'Stand down is open. Walk your board: planned commitments, then extras you shipped.',
      coach: 'Stand down is open. Walk your board: planned commitments, then extras you shipped.',
      minimal: 'Stand down is open. Walk your board: planned commitments, then extras you shipped.',
      playful:
        'Stand down is open. Walk your board: planned commitments, then extras you shipped. Main character energy: celebrate the plot points you actually moved.',
      snarky: 'Stand down is open. Walk your board: planned commitments, then extras you shipped.',
      bold: 'Stand down is open. Walk your board: planned commitments, then extras you shipped. Own the board, confidence yes, fiction no.',
      boldR21:
        'Stand down is open, walk the board like you mean it: what you promised with your eyes open, what you actually touched. Hot, blunt, zero “synergy” pillow talk.',
      snarkyR21:
        'Stand down is open, walk the board and stop acting like you know what you are doing when the numbers say otherwise. Planned shit vs shipped shit, plus the extras. Crass words, not sexual ones.',
    })
  }
  if (after <= 5) {
    return personaLine(personality, {
      warm: `${after} minute${after === 1 ? '' : 's'} into stand down. Check off what landed today.`,
      coach: `${after} minute${after === 1 ? '' : 's'} into stand down. Check off what landed today. Compare to your stand-up snapshot.`,
      minimal: `${after} minute${after === 1 ? '' : 's'} into stand down. Check off what landed today.`,
      playful: `${after} minute${after === 1 ? '' : 's'} into stand down. Check off what landed today. Tick boxes like you are popping bubble wrap.`,
      snarky: `${after} minute${after === 1 ? '' : 's'} into stand down. Check off what landed today.`,
      bold: `${after} minute${after === 1 ? '' : 's'} into stand down. Check off what landed today. Still time, tighten the record while memory is sharp.`,
      boldR21: `${after} minute${after === 1 ? '' : 's'} into stand down, tick what actually shipped while you still remember doing it. Blunt words, zero creep.`,
      snarkyR21: `${after} minute${after === 1 ? '' : 's'} into stand down, check the boxes before your brain starts rewriting history like a PR department. Foul language, zero sex creep.`,
    })
  }
  return personaLine(personality, {
    warm: `${after} minutes into stand down. Close the loop on today’s sprint slice.`,
    coach: `${after} minutes into stand down. Close the loop on today’s sprint slice.`,
    minimal: `${after} minutes into stand down. Close the loop on today’s sprint slice.`,
    playful: `${after} minutes into stand down. Close the loop on today’s sprint slice. Bonus round: anything sparkly that was not on the morning list?`,
    snarky: `${after} minutes into stand down. Close the loop on today’s sprint slice.`,
    bold: `${after} minutes into stand down. Close the loop on today’s sprint slice. Close the loop, half-truths sour overnight.`,
    boldR21: `${after} minutes into stand down, close the loop while the day’s still willing to kiss you back. Say what shipped, what didn’t, and what you’re hiding behind charm.`,
    snarkyR21: `${after} minutes into stand down, close the fucking loop. Half-truths rot; write the ugly version before you sleep. Not sexual, just mean and accurate.`,
  })
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
      return personaLine(personality, {
        warm: "Stand up starts in one minute. I'll be right here.",
        coach: "Stand up starts in one minute. Let's line up your intentions.",
        minimal: 'Stand up. 1 min.',
        playful: 'Stand up starts in one minute. Deep breath. Then we roll.',
        snarky: 'Stand up starts in one minute. Be on time.',
        bold: 'Stand up starts in one minute. Pick commitments you will still like at midnight.',
        boldR21:
          'Stand up in sixty seconds. Name what you will actually finish today, not the version you paste into Slack. 18+ wording only in here; do not be a creep IRL.',
        snarkyR21:
          'Stand up in one fucking minute, show up sober enough to tell the truth about what ships today. Not sex noise, just zero tolerance for your own bullshit.',
      })
    }
    if (m <= 5) {
      return personaLine(personality, {
        warm: `${m} minute${m === 1 ? '' : 's'} until your ${event}.${tap}`,
        coach: `${m} minute${m === 1 ? '' : 's'} until your ${event}.${tap} Keep scope tight.`,
        minimal: `${m} minute${m === 1 ? '' : 's'} until stand up.`,
        playful: `${m} minute${m === 1 ? '' : 's'} until your ${event}.${tap} Cue the tiny hype music in your head.`,
        snarky: `${m} minute${m === 1 ? '' : 's'} until your ${event}.${tap}`,
        bold: `${m} minute${m === 1 ? '' : 's'} until your ${event}.${tap} Keep only what survives daylight.`,
        boldR21: `${m} minute${m === 1 ? '' : 's'} until stand up.${tap} Strip the fantasy list, keep what you’d still chase after midnight.`,
        snarkyR21: `${m} minute${m === 1 ? '' : 's'} until stand up.${tap} Cut the crap scope: what actually ships today, not what looks cute on a slide.`,
      })
    }
    if (m <= 15) {
      return personaLine(personality, {
        warm: `${m} minutes until your ${event}.${tap} No rush. Just gathering.`,
        coach: `${m} minutes until your ${event}.${tap} Preview your top outcomes.`,
        minimal: `${m} minutes until your ${event}.${tap}${m} min to ${event}.`,
        playful: `${m} minutes until your ${event}.${tap} The day is warming up.`,
        snarky: `${m} minutes until your ${event}.${tap}${m} minutes. Prepare.`,
        bold: `${m} minutes until your ${event}.${tap} ${m} min, name a few crisp wins.`,
        boldR21: `${m} minutes until stand up.${tap} Slow burn the plan: what you’ll finish, what you’ll sweat for, what you’re only flirting with.`,
        snarkyR21: `${m} minutes until stand up.${tap} ${m} minutes to stop lying on the list. Pick outcomes, not theatre.`,
      })
    }
    if (m <= 29) {
      return personaLine(personality, {
        warm: `${m} minutes until your ${event}. ${Event} is coming up soon.`,
        coach: `${m} minutes until your ${event}. Block distractions early.`,
        minimal: `${m} minutes until stand up.`,
        playful: `${m} minutes until your ${event}. Coffee window closing soon.`,
        snarky: `${m} minutes until your ${event}. ${m} minutes out.`,
        bold: `${m} minutes until your ${event}. ${m} min out, scope vs ambition: pick a lane.`,
        boldR21: `${m} minutes until stand up, long runway to decide what you’re taking to bed tonight: real commitments, not “we’ll see.”`,
        snarkyR21: `${m} minutes until stand up, ${m} minutes to quit rehearsing excuses. Loud words, clean targets, still not porn.`,
      })
    }
    return personaLine(personality, {
      warm: `${m} minutes until your ${event}. Plenty of runway. I will nudge you closer in.`,
      coach: `${m} minutes until your ${event}. Use the time to clear your desk mentally.`,
      minimal: `${m} minutes until your ${event}.${m} min to ${event}.`,
      playful: `${m} minutes until your ${event}. Still in the green room.`,
      snarky: `${m} minutes until your ${event}. ${Event} in ${m} minutes.`,
      bold: `${m} minutes until your ${event}. Soon, put your best work up front.`,
      boldR21: `${m} minutes until stand up, enough runway to pick the work you’ll actually touch, not the work you’ll only flirt with in a status meeting.`,
      snarkyR21: `${m} minutes until stand up, enough time to delete the fantasy tasks and write the ugly honest list. Swearing allowed; sexual harassment isn’t.`,
    })
  }

  if (dm === 0) {
    return personaLine(personality, {
      warm: 'Time for your stand up. Tap here whenever you are ready. I will stay with you.',
      coach: 'Time for your stand up. Tap to open the flow and name your top focus.',
      minimal: 'Time for your stand up. Tap to start.',
      playful: 'Time for your stand up. Tap. Let us make today feel doable.',
      snarky: 'Time for your stand up. Tap to begin now.',
      bold: 'Time for your stand up. Tap in, say what you want today to remember.',
      boldR21:
        'Time for stand up, open the app and say what you’re finishing today like you mean it: hungry, blunt, no “circle back” foreplay. Adults-only tone in text; behave in person.',
      snarkyR21:
        'Time for stand up, open the fucking app and write the real list before your brain starts ad-libbing the task list. Crude, not sexual, just honest.',
    })
  }

  const after = dm
  if (after === 1) {
    return personaLine(personality, {
      warm: 'Stand up has just begun. Tap to keep going in the flow.',
      coach: 'Stand up has just begun. Capture commitments while they are fresh.',
      minimal: 'Stand up has just begun. In progress.',
      playful: 'Stand up has just begun. Momentum mode: on.',
      snarky: 'Stand up has just begun. Stay on task.',
      bold: 'Stand up has just begun. Momentum suits you, lock the plan before it drifts.',
      boldR21:
        'Stand up just started, lock the plan while adrenaline’s hot: what you’ll ship, what you’ll sweat, what you’re done pretending about.',
      snarkyR21:
        'Stand up just started, stop fucking around and write commitments you can defend when tonight calls you out.',
    })
  }
  if (after <= 5) {
    return personaLine(personality, {
      warm: `${after} minute${after === 1 ? '' : 's'} into your stand up. Tap to open the flow.`,
      coach: `${after} minute${after === 1 ? '' : 's'} into your stand up. Tap to open the flow. Adjust if priorities shifted.`,
      minimal: `${after} minute${after === 1 ? '' : 's'} into stand up. Tap.`,
      playful: `${after} minute${after === 1 ? '' : 's'} into your stand up. Tap to open the flow. Shuffle the deck. Keep only the hits.`,
      snarky: `${after} minute${after === 1 ? '' : 's'} into your stand up. Tap to open the flow.`,
      bold: `${after} minute${after === 1 ? '' : 's'} into your stand up. Tap to open the flow. Swap swagger for specifics while it is easy.`,
      boldR21: `${after} minute${after === 1 ? '' : 's'} into stand up, tap in and tighten the list while honesty still feels sexy, not scary.`,
      snarkyR21: `${after} minute${after === 1 ? '' : 's'} into stand up, tap the flow and fix the plan before it rots. Mean words, zero sex creep.`,
    })
  }
  return personaLine(personality, {
    warm: `${after} minutes into your stand up. Tap to open the flow. Still time to refine your list.`,
    coach: `${after} minutes into your stand up. Tap to open the flow. Check that nothing critical slipped.`,
    minimal: `${after} minutes into stand up. Tap.`,
    playful: `${after} minutes into your stand up. Tap to open the flow. Mid-arc polish pass. Tighten the story beats.`,
    snarky: `${after} minutes into your stand up. Tap to open the flow. Close the loop before the window ends.`,
    bold: `${after} minutes into your stand up. Tap to open the flow. Finish strong, vague promises do not ship.`,
    boldR21: `${after} minutes into stand up, still time to make the list feel like a dare you’ll actually follow through on.`,
    snarkyR21: `${after} minutes into stand up, close the loop before you sand it down for LinkedIn. Crass, not sexual.`,
  })
}

export function buildFarewellBannerLine(kind: 'farewellUp' | 'farewellDown', personality: ScrumMasterPersonality): string {
  if (kind === 'farewellUp') {
    return personaLine(personality, {
      warm: 'Have a calm, productive day. I will meet you at stand down to review what shipped versus this morning’s plan.',
      coach: 'Ship with intent. Capture outcomes as you go so stand down is quick and honest.',
      minimal: 'Have a good day.',
      playful: 'You crushed the plot. I will host the desk Oscars at stand down.',
      snarky: 'Execute. We reconcile at stand down.',
      bold: 'Ship something solid, bring receipts to stand down.',
      boldR21:
        'Go do good work, then bring the receipts to stand down so tonight can cut through the story you told this morning. Spicy text stays in the app; be normal to humans.',
      snarkyR21:
        'Go ship real shit today, stand down will call you out on the fairy tale later. Loud mouth, clean targets, nothing sexual in the insults.',
    })
  }
  return personaLine(personality, {
    warm: 'Rest well. Tomorrow is a fresh sprint day. I will see you at stand up.',
    coach: 'Close the laptop with a clear picture of done vs carry-over. See you tomorrow.',
    minimal: 'See you tomorrow.',
    playful: 'Curtain call! Toss me the bloopers and the bloomin’ brilliant bits before you log off.',
    snarky: 'Day closed. Be back on time tomorrow.',
    bold: 'Shut down clean, tomorrow starts fresher.',
    boldR21:
      'Shut it down like you mean it, leave the day stripped, satisfied, and too honest for a status email. Tomorrow we flirt with the next list.',
    snarkyR21:
      'Close the damn day, tomorrow’s stand up will roast you if you leave loose ends. Crude talk, not sexual harassment.',
  })
}

export function scrumLiveSubtitle(personality: ScrumMasterPersonality, standUp: boolean): string {
  if (standUp) {
    return personaLine(personality, {
      warm: 'Add what you intend to finish. I will keep it visible today.',
      coach: 'Name outcomes, not busywork. One line per commitment is enough.',
      minimal: 'Today’s commitments.',
      playful: 'Chuck commitments in like confetti. We will sweep the floor later.',
      snarky: 'List what must ship today. Drop the rest.',
      bold: 'Ship today, skip wishful thinking.',
      boldR21:
        'Write what you will actually finish today. Specific, hungry, no corporate soft focus.',
      snarkyR21:
        'List what the fuck ships today, drop the vanity tasks before they embarrass you at stand down. Vulgar, not sexual.',
    })
  }
  return personaLine(personality, {
    warm: 'Tick off what completed today against your stand-up plan. Note extras you finished and what carries forward.',
    coach: 'Sprint review: planned vs done, blockers, carry-over. Log it while it is fresh.',
    minimal: 'Planned vs shipped today.',
    playful: 'Sticker-chart energy: check the real wins, laugh at the surprises, park the rest for tomorrow’s episode.',
    snarky: 'Account for every commitment from stand up. Move unfinished work deliberately.',
    bold: 'Plan vs done, keep it crisp and honest.',
    boldR21:
      'Stand-down review: planned vs done, with the lights low and the excuses naked. Say what shipped, what didn’t, what you’re still teasing.',
    snarkyR21:
      'Stand-down math: planned vs done, carry-over, and the shit you “forgot” to log. Swear if it helps, don’t confuse crass with creepy.',
  })
}

export const SM_COMPLETED_LINGER_MS = 60 * 60 * 1000

/** Completed Scrum Master tasks stay under Today → Scrum Master for one hour before they appear only under Done. */
export function isScrumMasterCompletedLingering(task: Task, nowMs: number): boolean {
  if (task.category !== SCRUM_MASTER_CATEGORY) return false
  if (!task.completed || !task.completedAt) return false
  if (task.scheduledFor !== 'today') return false
  return nowMs - new Date(task.completedAt).getTime() < SM_COMPLETED_LINGER_MS
}

export function scrumVoiceLeadIn(personality: ScrumMasterPersonality): string {
  return personaLine(personality, {
    warm: 'says…',
    coach: 'says…',
    minimal: '…',
    playful: 'chimes in…',
    snarky: 'states…',
    bold: 'whispers…',
    boldR21: 'breathes in your ear…',
    snarkyR21: 'spits it out…',
  })
}

export function scrumSessionHeaderParts(
  personality: ScrumMasterPersonality,
  phase: 'standUp' | 'standDown',
): { emphasis: string; after: string } {
  if (phase === 'standUp') {
    return {
      emphasis: 'Stand up',
      after: personaLine(personality, {
        warm: ' has started.',
        coach: ' is live. Lock your intentions.',
        minimal: ' live.',
        playful: ' is live. Cue the drumroll for today’s hero arc.',
        snarky: ' has started. Focus.',
        bold: ' is live, commitments you can stand by later.',
        boldR21: ' is live, lock the kind of intentions you’d defend with your shirt half unbuttoned.',
        snarkyR21: ' is live, stop fucking around and write the real list.',
      }),
    }
  }
  return {
    emphasis: 'Stand down',
    after: personaLine(personality, {
      warm: ' has started.',
      coach: ' is live. Reconcile shipped vs planned.',
      minimal: ' live.',
      playful: ' is on. Roll credits on today’s sprint slice.',
      snarky: ' has started. Account for the day.',
      bold: ' is live, facts first, polish second.',
      boldR21: ' is live, strip the story to what you actually did with your hands today.',
      snarkyR21: ' is live, reconcile the fucking day before your backlog files a restraining order.',
    }),
  }
}

export function scrumNotifyOptInCta(personality: ScrumMasterPersonality): string {
  return personaLine(personality, {
    warm: 'Turn on notifications for stand up and stand down',
    coach: 'Enable notifications for stand up and stand down',
    minimal: 'Enable notifications',
    playful: 'Ping me for the daily opening and closing credits',
    snarky: 'Enable stand up and stand down notifications',
    bold: 'Enable alerts for stand up and stand down.',
    boldR21: 'Turn on alerts, I’ll nag you like someone who actually wants you to show up.',
    snarkyR21: 'Enable notifications or miss the ritual and cry about it later.',
  })
}

export function scrumQuickAddStandUpPlaceholder(personality: ScrumMasterPersonality): string {
  return personaLine(personality, {
    warm: 'What did you commit to finish today?',
    coach: 'Name the outcomes you will finish today (one line each).',
    minimal: 'Commitments…',
    playful: 'Drop the quests you are actually finishing today. No side-quest smuggling.',
    snarky: 'List today’s must-ship commitments.',
    bold: 'What finishes today, be specific.',
    boldR21: 'What are you finishing today, say it like you’d dare someone to hold you to it.',
    snarkyR21: 'What the fuck ships today, one line each, no fairy tales.',
  })
}

export function scrumQuickAddStandDownPlaceholder(personality: ScrumMasterPersonality): string {
  return personaLine(personality, {
    warm: 'Note carry-overs or extra work you shipped today…',
    coach: 'Carry-over, blockers, extras shipped today…',
    minimal: 'Carry-over & extras…',
    playful: 'Spill the tea: carry-overs, bonus wins, sneaky little extras…',
    snarky: 'Log carry-over and off-plan completions.',
    bold: 'Carry-over and extras, spell them out.',
    boldR21: 'Spill carry-over and bonus wins, honest, messy, nothing you’d hide under the sheets.',
    snarkyR21: 'Log carry-over and off-plan shit, ugly truth beats a clean lie.',
  })
}

export function scrumEndStandUpLabel(personality: ScrumMasterPersonality): string {
  return personaLine(personality, {
    warm: 'End stand up',
    coach: 'End stand-up session',
    minimal: 'End',
    playful: 'Wrap the huddle',
    snarky: 'End stand up',
    bold: 'Call it: stand up done',
    boldR21: 'Kill stand up, before the flirting with deadlines gets old.',
    snarkyR21: 'End stand up, before this meeting becomes a hostage situation.',
  })
}

export function scrumEndStandDownLabel(personality: ScrumMasterPersonality): string {
  return personaLine(personality, {
    warm: 'End stand down',
    coach: 'End stand-down session',
    minimal: 'End',
    playful: 'That’s a wrap on stand down',
    snarky: 'End stand down',
    bold: 'Call it: stand down done',
    boldR21: 'Close stand down, leave the day breathless and accounted for.',
    snarkyR21: 'End stand down, put the day out of its misery.',
  })
}

export function scrumGatherIntoSectionTail(personality: ScrumMasterPersonality): string {
  return personaLine(personality, {
    warm: 'Gather stand-up tasks into their own section',
    coach: 'Group stand-up commitments under a dedicated heading',
    minimal: 'Sectionize stand-up tasks',
    playful: 'Herd today’s stand-up goodies into their glitter corral',
    snarky: 'Move stand-up tasks into the Scrum Master section',
    bold: 'Sweep stand-up tasks somewhere they cannot ghost you later.',
    boldR21: 'Corral stand-up tasks somewhere they can’t ghost you after midnight.',
    snarkyR21: 'Stuff stand-up tasks under Scrum Master so they stop hiding like cowards.',
  })
}

export function scrumTaskListCategorySubtitle(
  personality: ScrumMasterPersonality,
  mode: 'idle' | 'standUp' | 'standDown',
  openCount: number,
): string {
  const n = `${openCount} ${openCount === 1 ? 'task' : 'tasks'}`
  if (mode === 'standDown') {
    return personaLine(personality, {
      warm: 'Sprint review · planned vs shipped',
      coach: 'Planned vs shipped · carry-over',
      minimal: 'Review',
      playful: 'Scoreboard vs script · honest bloopers welcome',
      snarky: 'Planned vs shipped',
      bold: 'Planned vs shipped. Tight review.',
      boldR21: 'Planned vs shipped. Get intimate with the truth.',
      snarkyR21: 'Planned vs shipped. Stop lying on the scoreboard.',
    })
  }
  if (mode === 'standUp') {
    return personaLine(personality, {
      warm: 'Today’s sprint commitments',
      coach: 'Commitments for today’s sprint slice',
      minimal: 'Commitments',
      playful: 'Today’s “yes I’m doing this” pile',
      snarky: 'Today’s commitments',
      bold: 'Bold commitments that still fit reality.',
      boldR21: 'Today’s commitments: hot enough to mean it, tight enough to ship.',
      snarkyR21: 'Today’s commitments: write them like you’re tired of your own bullshit.',
    })
  }
  return n
}

export type StandDownReviewParams =
  | { kind: 'noPlan'; extraOutsidePlan: number }
  | { kind: 'withPlan'; plannedDone: number; plannedTotal: number; plannedOpen: number; extraOutsidePlan: number }

export function scrumStandDownReviewHeading(personality: ScrumMasterPersonality, params: StandDownReviewParams): string {
  if (params.kind === 'noPlan') {
    return personaLine(personality, {
      warm: 'Sprint review · today',
      coach: 'Stand-down review · today',
      minimal: 'Review · today',
      playful: 'Today’s mini-retro',
      snarky: 'Sprint review · today',
      bold: 'Today’s review: short, sharp, and usefully honest.',
      boldR21: 'Today’s review: short, blunt, allergic to polite fiction.',
      snarkyR21: 'Sprint review today. Steel yourself for the honest bit.',
    })
  }
  return personaLine(personality, {
    warm: 'Sprint review vs stand-up plan',
    coach: 'Review vs this morning’s plan',
    minimal: 'Plan vs done',
    playful: 'Script check: morning plan vs what actually filmed',
    snarky: 'Planned work vs completions',
    bold: 'Morning promises, afternoon evidence: make the introductions uncomfortable in the best way.',
    boldR21: 'Morning promises meet afternoon evidence. Make that reunion ugly-honest.',
    snarkyR21: 'Morning plan vs what you actually did. Time to feel bad in a useful way.',
  })
}

function extraDoneFragment(personality: ScrumMasterPersonality, n: number): string {
  if (n <= 0) return ''
  const unit = n === 1 ? 'completion' : 'completions'
  const taskU = n === 1 ? 'task' : 'tasks'
  return personaLine(personality, {
    warm: ` ${n} extra ${unit} already logged outside today’s stand-up list.`,
    coach: ` ${n} off-plan ${taskU} completed today (still worth noting).`,
    minimal: ` +${n} off-plan.`,
    playful: ` Plus ${n} sneaky-little off-list ${taskU} already tickled “done” (plot twists, not cheating).`,
    snarky: ` ${n} completions today were outside the stand-up plan.`,
    bold: ` ${n} off-plan ${unit}, impressive hustle; make sure the paper trail looks as good as you do.`,
    boldR21: ` ${n} off-plan ${unit}, dirty little wins still count if you log them plain honest.`,
    snarkyR21: ` ${n} off-plan ${unit}, stop pretending those didn’t happen, you clever bastard.`,
  })
}

function extraDoneFragmentWithPlan(personality: ScrumMasterPersonality, n: number): string {
  if (n <= 0) return ''
  const taskU = n === 1 ? 'task' : 'tasks'
  return personaLine(personality, {
    warm: ` · +${n} extra ${taskU} completed today outside that plan`,
    coach: ` · +${n} off-plan ${taskU} shipped today`,
    minimal: ` · +${n} off-plan`,
    playful: ` · +${n} bonus-scene ${taskU} not on the morning call sheet`,
    snarky: ` · +${n} done today outside the stand-up plan`,
    bold: ` · +${n} off-plan ${taskU}, tip your hat to the wins, side-eye the excuses.`,
    boldR21: ` · +${n} off-plan ${taskU}, confess the bonus heat; it counts if it shipped.`,
    snarkyR21: ` · +${n} off-plan ${taskU}, yeah, you did extra shit, own it without the humblebrag.`,
  })
}

export function scrumStandDownReviewBody(personality: ScrumMasterPersonality, params: StandDownReviewParams): string {
  if (params.kind === 'noPlan') {
    const base = personaLine(personality, {
      warm: 'Capture what actually shipped: check off tasks you completed today, including work that was not on this morning’s stand-up plan.',
      coach: 'Mark what shipped today, including anything not captured at stand up. Clarity now saves tomorrow.',
      minimal: 'Check off what shipped today.',
      playful: 'Honk the horn for anything you actually shipped today. Even the bonus scenes that were not on this morning’s marquee.',
      snarky: 'Record every completion from today, including off-plan work.',
      bold: 'Log what really shipped, bonus wins count, vague vibes do not get a plus-one.',
      boldR21:
        'Log what actually shipped today, off-plan wins too, like you’re confessing after a good night: specific, breathless, no fake modesty.',
      snarkyR21:
        'Write down every fucking completion today, including the off-plan stuff you “forgot” to mention. Not porn, just receipts.',
    })
    return base + extraDoneFragment(personality, params.extraOutsidePlan)
  }
  const { plannedDone, plannedTotal, plannedOpen, extraOutsidePlan } = params
  const mid = personaLine(personality, {
    warm:
      plannedOpen > 0
        ? ` · ${plannedOpen} still open (note carry-over for tomorrow’s sprint)`
        : ` · all stand-up items cleared or checked off`,
    coach:
      plannedOpen > 0
        ? ` · ${plannedOpen} still open. Flag carry-over for tomorrow`
        : ` · stand-up commitments cleared or checked`,
    minimal: plannedOpen > 0 ? ` · ${plannedOpen} open` : ' · clear',
    playful:
      plannedOpen > 0
        ? ` · ${plannedOpen} cliffhanger${plannedOpen === 1 ? '' : 's'}. Tag the carry-over for tomorrow’s episode`
        : ` · morning list: cleared like a snack pack`,
    snarky:
      plannedOpen > 0
        ? ` · ${plannedOpen} commitments remain open. Document carry-over`
        : ` · all stand-up items closed out`,
    bold:
      plannedOpen > 0
        ? ` · ${plannedOpen} still open, name the carry-over before nostalgia rewrites the night`
        : ` · plan cleared, rare, hot, and extremely your brand`,
    boldR21:
      plannedOpen > 0
        ? ` · ${plannedOpen} still open, admit what you’ll hammer out tomorrow before you seduce yourself with “almost done”`
        : ` · plan cleared, honest and rare`,
    snarkyR21:
      plannedOpen > 0
        ? ` · ${plannedOpen} still open, write carry-over like you mean it, not like HR is reading over your shoulder`
        : ` · all closed, don’t get cute, get accurate`,
  })
  return (
    personaLine(personality, {
      warm: `From stand up: ${plannedDone}/${plannedTotal} commitment${plannedTotal === 1 ? '' : 's'} marked done`,
      coach: `Stand-up plan: ${plannedDone}/${plannedTotal} marked done`,
      minimal: `${plannedDone}/${plannedTotal} done`,
      playful: `Morning bingo: ${plannedDone}/${plannedTotal} squares flipped`,
      snarky: `Stand-up plan: ${plannedDone}/${plannedTotal} done`,
      bold: `Stand-up score: ${plannedDone}/${plannedTotal}, no participation trophies, only the good kind of tension.`,
      boldR21: `Stand-up score ${plannedDone}/${plannedTotal}, kiss the wins, flag the misses, keep it consensual with reality.`,
      snarkyR21: `Stand-up score ${plannedDone}/${plannedTotal}, math doesn’t care about your feelings, so write it down anyway.`,
    }) +
    mid +
    extraDoneFragmentWithPlan(personality, extraOutsidePlan)
  )
}

export type ScrumNotifyBodyKey =
  | 'su-10'
  | 'su-5'
  | 'su-1'
  | 'su-0'
  | 'sd-30'
  | 'sd-15'
  | 'sd-5'
  | 'sd-1'
  | 'sd-0'
  | 'su-after1'
  | 'sd-after1'

export function scrumNotifyPayload(
  key: ScrumNotifyBodyKey,
  name: string,
  personality: ScrumMasterPersonality,
): { title: string; body: string } {
  const W = (title: string, body: string) => ({ title, body })
  type NotifyRow = { title: string; body: string }
  const line = (rec: Record<Exclude<ScrumMasterPersonality, 'slayR21'>, NotifyRow>): { title: string; body: string } => {
    const key = personality === 'slayR21' ? 'playful' : personality
    const v = rec[key as keyof typeof rec] ?? rec.warm
    let body = v.body.replace(/{name}/g, name)
    if (personality === 'slayR21') {
      body += ' Yassss slay the checklist, not humans.'
    }
    return { title: v.title.replace(/{name}/g, name), body }
  }
  switch (key) {
    case 'su-10':
      return line({
        warm: W('{name} · Stand up soon', 'Stand up is in about ten minutes.'),
        coach: W('{name} · Stand up soon', 'Ten minutes. Queue your top outcomes for today.'),
        minimal: W('{name} · Stand up', 'Ten minutes.'),
        playful: W('{name} · Stand up soon', 'Ten-minute trailer drop. Stretch, hydrate, hype the day.'),
        snarky: W('{name} · Stand up soon', 'Stand up in ten minutes. Be ready.'),
        bold: W('{name} · Stand up soon', 'Ten minutes, pick what deserves the spotlight and your best smolder.'),
        boldR21: W(
          '{name} · Stand up soon',
          'Ten minutes, pick commitments you’d still chase after midnight, not busywork that only looks good under office lights.',
        ),
        snarkyR21: W(
          '{name} · Stand up soon',
          'Stand up in ten minutes, trim the fantasy list before it makes you look stupid. Crass, not creepy.',
        ),
      })
    case 'su-5':
      return line({
        warm: W('{name} · Stand up', 'Five minutes until stand up.'),
        coach: W('{name} · Stand up', 'Five minutes. Tighten scope to what can ship.'),
        minimal: W('{name} · Stand up', 'Five minutes.'),
        playful: W('{name} · Stand up', 'Five minutes until go-time. Wiggle the jitters out.'),
        snarky: W('{name} · Stand up', 'Five minutes to stand up.'),
        bold: W('{name} · Stand up', 'Five minutes, lose the fantasy wardrobe, keep what still fits reality.'),
        boldR21: W(
          '{name} · Stand up',
          'Five minutes, cut anything you wouldn’t still want pressed up against a deadline tonight.',
        ),
        snarkyR21: W('{name} · Stand up', 'Five minutes to stand up, delete the cosplay tasks. Meaner words, zero sex trash.'),
      })
    case 'su-1':
      return line({
        warm: W('{name} · Stand up', 'One minute until stand up.'),
        coach: W('{name} · Stand up', 'One minute. Open the app and breathe once.'),
        minimal: W('{name} · Stand up', 'One minute.'),
        playful: W('{name} · Stand up', 'Sixty-second drumroll. Mic check for your day.'),
        snarky: W('{name} · Stand up', 'One minute. Open poco.'),
        bold: W('{name} · Stand up', 'One minute, open poco like you are meeting someone worth impressing.'),
        boldR21: W('{name} · Stand up', 'One minute, open poco and say what you’ll finish like you mean it, breath and all.'),
        snarkyR21: W('{name} · Stand up', 'One minute. Open poco or admit you’re scared of your own list.'),
      })
    case 'su-0':
      return line({
        warm: W('{name} · Stand up', 'Time for stand up. Open poco when you are ready.'),
        coach: W('{name} · Stand up', 'Stand up window. Open poco and name today’s commitments.'),
        minimal: W('{name} · Stand up', 'Stand up now.'),
        playful: W('{name} · Stand up', 'And… scene! Stand up is open. Jump in whenever you are ready.'),
        snarky: W('{name} · Stand up', 'Stand up. Open poco now.'),
        bold: W('{name} · Stand up', 'Stand up is open, bring commitments sharp enough to flirt with daylight.'),
        boldR21: W(
          '{name} · Stand up',
          'Stand up is open, write what you’ll actually finish today like you’re done being coy with yourself.',
        ),
        snarkyR21: W('{name} · Stand up', 'Stand up. Open poco now and stop lying on the record.'),
      })
    case 'sd-30':
      return line({
        warm: W('{name} · Stand down', 'Stand down soon. Start your end-of-day review.'),
        coach: W('{name} · Stand down', 'Stand down approaching. Prep planned vs shipped notes.'),
        minimal: W('{name} · Stand down', 'Stand down soon.'),
        playful: W('{name} · Stand down', 'Half-hour trailer for the finale. Gather receipts for what shipped.'),
        snarky: W('{name} · Stand down', 'Stand down soon. Prepare review.'),
        bold: W('{name} · Stand down', 'Stand down incoming, separate signal from swagger while you still look composed.'),
        boldR21: W(
          '{name} · Stand down',
          'Stand down soon, start stacking proof of what you actually touched today, not the story you tell strangers.',
        ),
        snarkyR21: W('{name} · Stand down', 'Stand down soon, prep the review or get roasted later. Your call.'),
      })
    case 'sd-15':
      return line({
        warm: W('{name} · Stand down', 'Fifteen minutes until stand down.'),
        coach: W('{name} · Stand down', 'Fifteen minutes. Capture carry-overs while fresh.'),
        minimal: W('{name} · Stand down', 'Fifteen minutes.'),
        playful: W('{name} · Stand down', 'Quarter-hour pep talk before the closing credits.'),
        snarky: W('{name} · Stand down', 'Fifteen minutes to stand down.'),
        bold: W('{name} · Stand down', 'Fifteen minutes, turn memory into evidence before it starts telling little white lies.'),
        boldR21: W(
          '{name} · Stand down',
          'Fifteen minutes, turn mushy memory into receipts while it still feels a little indecent to admit the truth.',
        ),
        snarkyR21: W(
          '{name} · Stand down',
          'Fifteen minutes to stand down, capture carry-over before your brain starts editing the highlight reel.',
        ),
      })
    case 'sd-5':
      return line({
        warm: W('{name} · Stand down', 'Five minutes until stand down.'),
        coach: W('{name} · Stand down', 'Five minutes. Line up done vs planned.'),
        minimal: W('{name} · Stand down', 'Five minutes.'),
        playful: W('{name} · Stand down', 'Five minutes until the desk Oscars for your day.'),
        snarky: W('{name} · Stand down', 'Five minutes to stand down.'),
        bold: W('{name} · Stand down', 'Five minutes, make peace with the plan before the debrief steals your thunder.'),
        boldR21: W(
          '{name} · Stand down',
          'Five minutes, kiss the plan goodbye if it’s a lie, hug it tight if it’s real, then prove it with numbers.',
        ),
        snarkyR21: W('{name} · Stand down', 'Five minutes to stand down, line up done vs planned before I start swearing.'),
      })
    case 'sd-1':
      return line({
        warm: W('{name} · Stand down', 'One minute until stand down.'),
        coach: W('{name} · Stand down', 'One minute. Open poco for the review.'),
        minimal: W('{name} · Stand down', 'One minute.'),
        playful: W('{name} · Stand down', 'Sixty seconds to cue the “what actually happened” montage.'),
        snarky: W('{name} · Stand down', 'One minute. Open poco.'),
        bold: W('{name} · Stand down', 'One minute, open poco and drop the act; the numbers want honesty.'),
        boldR21: W('{name} · Stand down', 'One minute, open poco and strip the story to what your hands actually did.'),
        snarkyR21: W('{name} · Stand down', 'One minute. Open poco, stand down doesn’t care about your excuses.'),
      })
    case 'sd-0':
      return line({
        warm: W('{name} · Stand down', 'Time for stand down. Review planned vs shipped today.'),
        coach: W('{name} · Stand down', 'Stand down. Reconcile commitments vs completions.'),
        minimal: W('{name} · Stand down', 'Stand down now.'),
        playful: W('{name} · Stand down', 'Roll credits on today. Stand down is open for hot takes and honest ticks.'),
        snarky: W('{name} · Stand down', 'Stand down. Review the day now.'),
        bold: W('{name} · Stand down', 'Stand down, let the scoreboard flirt with the truth, then walk away clean.'),
        boldR21: W(
          '{name} · Stand down',
          'Stand down, drag the truth out of today while it’s still warm: planned vs shipped, no pillow talk.',
        ),
        snarkyR21: W('{name} · Stand down', 'Stand down. Review the day now, planned vs shipped, no fairy tales.'),
      })
    case 'su-after1':
      return line({
        warm: W('{name} · Stand up', 'Refine today’s commitments while context is fresh.'),
        coach: W('{name} · Stand up', 'Tighten commitments while memory is hot.'),
        minimal: W('{name} · Stand up', 'Refine commitments.'),
        playful: W('{name} · Stand up', 'Still in the opening credits. Tweak your quest log while it feels fun.'),
        snarky: W('{name} · Stand up', 'Refine today’s commitments now.'),
        bold: W('{name} · Stand up', 'Polish the list, confidence is attractive, specificity is what gets you dinner.'),
        boldR21: W(
          '{name} · Stand up',
          'Refine the list, make it tight enough to sting, honest enough to survive stand down.',
        ),
        snarkyR21: W('{name} · Stand up', 'Refine commitments now before you start faking depth on the list.'),
      })
    case 'sd-after1':
      return line({
        warm: W('{name} · Stand down', 'Log carry-overs and extra completions from today.'),
        coach: W('{name} · Stand down', 'Capture carry-over and off-plan completions from today.'),
        minimal: W('{name} · Stand down', 'Log carry-over & extras.'),
        playful: W('{name} · Stand down', 'Tag the cliffhangers and the bonus wins you sneaked in today.'),
        snarky: W('{name} · Stand down', 'Log carry-over and off-plan work from today.'),
        bold: W('{name} · Stand down', 'Log carry-over and extras, future-you loves a paper trail more than a mystery.'),
        boldR21: W(
          '{name} · Stand down',
          'Log carry-over and sneaky wins, confess the messy stuff while it still feels a little too honest.',
        ),
        snarkyR21: W(
          '{name} · Stand down',
          'Log carry-over and off-plan shit, your backlog isn’t your therapist, stop whispering lies to it.',
        ),
      })
  }
}
