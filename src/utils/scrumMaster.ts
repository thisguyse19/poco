import type { ScrumMasterGender, ScrumMasterPersonality, ScrumMasterSettings, Task } from '../types'

export const SCRUM_MASTER_CATEGORY = 'Scrum Master'

export const SCRUM_MASTER_PERSONALITIES: {
  id: ScrumMasterPersonality
  title: string
  hint: string
}[] = [
  { id: 'warm', title: 'Warm', hint: 'Soft encouragement and gentle pacing' },
  { id: 'coach', title: 'Coach', hint: 'Clear structure and small next steps' },
  { id: 'minimal', title: 'Quiet', hint: 'Short lines, little flourish' },
  { id: 'playful', title: 'Playful', hint: 'Sparkly metaphors, cheeky asides, high fives' },
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
        playful: ' One minute until the end-of-day boss battle (it is friendly, promise).',
        stern: ' Be ready.',
      })}`
    }
    if (m <= 5) {
      return `${m} minutes until stand down.${tap}${pSuffix(personality, {
        warm: ' We will look at what you committed at stand up.',
        coach: ' Line up shipped work vs this morning’s plan.',
        minimal: `${m} min to review.`,
        playful: ' Scoreboard time — chalk up the wins before the buzzer.',
        stern: '',
      })}`
    }
    if (m <= 15) {
      return `${m} minutes until stand down — end-of-day review.${pSuffix(personality, {
        warm: ' Planned vs done, plus anything extra you finished.',
        coach: ' Note scope that slipped so tomorrow is honest.',
        minimal: '',
        playful: ' Sprint day finale — cue the highlight reel.',
        stern: ` ${m} minutes.`,
      })}`
    }
    if (m <= 29) {
      return `${m} minutes until stand down.${pSuffix(personality, {
        warm: ' You will reconcile what you promised at stand up with what shipped.',
        coach: ' Think shipped, carry-over, and surprises.',
        minimal: '',
        playful: ' Plot twist watch: what quietly shipped while nobody was looking?',
        stern: '',
      })}`
    }
    return `${m} minutes until stand down — your daily sprint review.${pSuffix(personality, {
      warm: ' Plenty of time to mentally stack wins and misses.',
      coach: ' Capture evidence of done work while memory is fresh.',
      minimal: `${m} min to stand down.`,
      playful: ' Grab confetti for the wins and a sticky note for the “whoops”.',
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
      playful: ' Main character energy: celebrate the plot points you actually moved.',
      stern: '',
    })}`
  }
  if (after <= 5) {
    return `${after} minute${after === 1 ? '' : 's'} into stand down. Check off what landed today.${pSuffix(personality, {
      warm: '',
      coach: ' Compare to your stand-up snapshot.',
      minimal: '',
      playful: ' Tick boxes like you are popping bubble wrap.',
      stern: '',
    })}`
  }
  return `${after} minutes into stand down. Close the loop on today’s sprint slice.${pSuffix(personality, {
    warm: '',
    coach: '',
    minimal: '',
    playful: ' Bonus round: anything sparkly that was not on the morning list?',
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
        playful: ' Cue the tiny hype music in your head.',
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
      playful: ' Shuffle the deck — keep only the hits.',
      stern: '',
    })}`
  }
  return `${after} minutes into your ${event}. Tap to open the flow.${pSuffix(personality, {
    warm: ' Still time to refine your list.',
    coach: ' Check that nothing critical slipped.',
    minimal: '',
    playful: ' Mid-arc polish pass — tighten the story beats.',
    stern: ' Close the loop before the window ends.',
  })}`
}

export function buildFarewellBannerLine(kind: 'farewellUp' | 'farewellDown', personality: ScrumMasterPersonality): string {
  if (kind === 'farewellUp') {
    return pSuffix(personality, {
      warm: 'Have a calm, productive day. I will meet you at stand down to review what shipped versus this morning’s plan.',
      coach: 'Ship with intent — capture outcomes as you go so stand down is quick and honest.',
      minimal: 'Have a good day.',
      playful: 'You crushed the plot — I will host the silly little awards show at stand down.',
      stern: 'Execute. We reconcile at stand down.',
    })
  }
  return pSuffix(personality, {
    warm: 'Rest well — tomorrow is a fresh sprint day. I will see you at stand up.',
    coach: 'Close the laptop with a clear picture of done vs carry-over. See you tomorrow.',
    minimal: 'See you tomorrow.',
    playful: 'Curtain call! Toss me the bloopers and the bloomin’ brilliant bits before you log off.',
    stern: 'Day closed. Be back on time tomorrow.',
  })
}

export function scrumLiveSubtitle(personality: ScrumMasterPersonality, standUp: boolean): string {
  if (standUp) {
    return pSuffix(personality, {
      warm: 'Add what you intend to finish — I will keep it visible today.',
      coach: 'Name outcomes, not busywork. One line per commitment is enough.',
      minimal: 'Today’s commitments.',
      playful: 'Chuck commitments in like confetti — we will sweep the floor later.',
      stern: 'List what must ship today. Drop the rest.',
    })
  }
  return pSuffix(personality, {
    warm: 'Tick off what completed today against your stand-up plan — note extras you finished and what carries forward.',
    coach: 'Sprint review: planned vs done, blockers, carry-over. Log it while it is fresh.',
    minimal: 'Planned vs shipped today.',
    playful: 'Sticker-chart energy: check the real wins, laugh at the surprises, park the rest for tomorrow’s episode.',
    stern: 'Account for every commitment from stand up. Move unfinished work deliberately.',
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
  return pSuffix(personality, {
    warm: 'says…',
    coach: 'says…',
    minimal: '—',
    playful: 'chimes in…',
    stern: 'states…',
  })
}

export function scrumSessionHeaderParts(
  personality: ScrumMasterPersonality,
  phase: 'standUp' | 'standDown',
): { emphasis: string; after: string } {
  if (phase === 'standUp') {
    return {
      emphasis: 'Stand up',
      after: pSuffix(personality, {
        warm: ' has started.',
        coach: ' is live — lock your intentions.',
        minimal: ' live.',
        playful: ' is live — cue the drumroll for today’s hero arc.',
        stern: ' has started. Focus.',
      }),
    }
  }
  return {
    emphasis: 'Stand down',
    after: pSuffix(personality, {
      warm: ' has started.',
      coach: ' is live — reconcile shipped vs planned.',
      minimal: ' live.',
      playful: ' is on — roll credits on today’s sprint slice.',
      stern: ' has started. Account for the day.',
    }),
  }
}

export function scrumNotifyOptInCta(personality: ScrumMasterPersonality): string {
  return pSuffix(personality, {
    warm: 'Turn on notifications for stand up and stand down',
    coach: 'Enable notifications for stand up and stand down',
    minimal: 'Enable notifications',
    playful: 'Ping me for the daily opening and closing credits',
    stern: 'Enable stand up and stand down notifications',
  })
}

export function scrumQuickAddStandUpPlaceholder(personality: ScrumMasterPersonality): string {
  return pSuffix(personality, {
    warm: 'What did you commit to finish today?',
    coach: 'Name the outcomes you will finish today (one line each).',
    minimal: 'Commitments…',
    playful: 'Drop the quests you are actually finishing today — no side-quest smuggling.',
    stern: 'List today’s must-ship commitments.',
  })
}

export function scrumQuickAddStandDownPlaceholder(personality: ScrumMasterPersonality): string {
  return pSuffix(personality, {
    warm: 'Note carry-overs or extra work you shipped today…',
    coach: 'Carry-over, blockers, extras shipped today…',
    minimal: 'Carry-over & extras…',
    playful: 'Spill the tea: carry-overs, bonus wins, sneaky little extras…',
    stern: 'Log carry-over and off-plan completions.',
  })
}

export function scrumEndStandUpLabel(personality: ScrumMasterPersonality): string {
  return pSuffix(personality, {
    warm: 'End stand up',
    coach: 'End stand-up session',
    minimal: 'End',
    playful: 'Wrap the huddle',
    stern: 'End stand up',
  })
}

export function scrumEndStandDownLabel(personality: ScrumMasterPersonality): string {
  return pSuffix(personality, {
    warm: 'End stand down',
    coach: 'End stand-down session',
    minimal: 'End',
    playful: 'That’s a wrap on stand down',
    stern: 'End stand down',
  })
}

export function scrumGatherIntoSectionTail(personality: ScrumMasterPersonality): string {
  return pSuffix(personality, {
    warm: 'Gather stand-up tasks into their own section',
    coach: 'Group stand-up commitments under a dedicated heading',
    minimal: 'Sectionize stand-up tasks',
    playful: 'Herd today’s stand-up goodies into their glitter corral',
    stern: 'Move stand-up tasks into the Scrum Master section',
  })
}

export function scrumTaskListCategorySubtitle(
  personality: ScrumMasterPersonality,
  mode: 'idle' | 'standUp' | 'standDown',
  openCount: number,
): string {
  const n = `${openCount} ${openCount === 1 ? 'task' : 'tasks'}`
  if (mode === 'standDown') {
    return pSuffix(personality, {
      warm: 'Sprint review · planned vs shipped',
      coach: 'Planned vs shipped · carry-over',
      minimal: 'Review',
      playful: 'Scoreboard vs script · honest bloopers welcome',
      stern: 'Planned vs shipped',
    })
  }
  if (mode === 'standUp') {
    return pSuffix(personality, {
      warm: 'Today’s sprint commitments',
      coach: 'Commitments for today’s sprint slice',
      minimal: 'Commitments',
      playful: 'Today’s “yes I’m doing this” pile',
      stern: 'Today’s commitments',
    })
  }
  return n
}

export type StandDownReviewParams =
  | { kind: 'noPlan'; extraOutsidePlan: number }
  | { kind: 'withPlan'; plannedDone: number; plannedTotal: number; plannedOpen: number; extraOutsidePlan: number }

export function scrumStandDownReviewHeading(personality: ScrumMasterPersonality, params: StandDownReviewParams): string {
  if (params.kind === 'noPlan') {
    return pSuffix(personality, {
      warm: 'Sprint review · today',
      coach: 'Stand-down review · today',
      minimal: 'Review · today',
      playful: 'Today’s mini-retro',
      stern: 'Sprint review · today',
    })
  }
  return pSuffix(personality, {
    warm: 'Sprint review vs stand-up plan',
    coach: 'Review vs this morning’s plan',
    minimal: 'Plan vs done',
    playful: 'Script check: morning plan vs what actually filmed',
    stern: 'Planned work vs completions',
  })
}

function extraDoneFragment(personality: ScrumMasterPersonality, n: number): string {
  if (n <= 0) return ''
  const unit = n === 1 ? 'completion' : 'completions'
  const taskU = n === 1 ? 'task' : 'tasks'
  return pSuffix(personality, {
    warm: ` ${n} extra ${unit} already logged outside today’s stand-up list.`,
    coach: ` ${n} off-plan ${taskU} completed today (still worth noting).`,
    minimal: ` +${n} off-plan.`,
    playful: ` Plus ${n} sneaky-little off-list ${taskU} already tickled “done” (plot twists, not cheating).`,
    stern: ` ${n} completions today were outside the stand-up plan.`,
  })
}

function extraDoneFragmentWithPlan(personality: ScrumMasterPersonality, n: number): string {
  if (n <= 0) return ''
  const taskU = n === 1 ? 'task' : 'tasks'
  return pSuffix(personality, {
    warm: ` · +${n} extra ${taskU} completed today outside that plan`,
    coach: ` · +${n} off-plan ${taskU} shipped today`,
    minimal: ` · +${n} off-plan`,
    playful: ` · +${n} bonus-scene ${taskU} not on the morning call sheet`,
    stern: ` · +${n} done today outside the stand-up plan`,
  })
}

export function scrumStandDownReviewBody(personality: ScrumMasterPersonality, params: StandDownReviewParams): string {
  if (params.kind === 'noPlan') {
    const base = pSuffix(personality, {
      warm: 'Capture what actually shipped: check off tasks you completed today, including work that was not on this morning’s stand-up plan.',
      coach: 'Mark what shipped today, including anything not captured at stand up — clarity now saves tomorrow.',
      minimal: 'Check off what shipped today.',
      playful: 'Honk the horn for anything you actually shipped today — even the bonus scenes that were not on this morning’s marquee.',
      stern: 'Record every completion from today, including off-plan work.',
    })
    return base + extraDoneFragment(personality, params.extraOutsidePlan)
  }
  const { plannedDone, plannedTotal, plannedOpen, extraOutsidePlan } = params
  const mid = pSuffix(personality, {
    warm:
      plannedOpen > 0
        ? ` · ${plannedOpen} still open (note carry-over for tomorrow’s sprint)`
        : ` · all stand-up items cleared or checked off`,
    coach:
      plannedOpen > 0
        ? ` · ${plannedOpen} still open — flag carry-over for tomorrow`
        : ` · stand-up commitments cleared or checked`,
    minimal: plannedOpen > 0 ? ` · ${plannedOpen} open` : ' · clear',
    playful:
      plannedOpen > 0
        ? ` · ${plannedOpen} cliffhanger${plannedOpen === 1 ? '' : 's'} — tag the carry-over for tomorrow’s episode`
        : ` · morning list: cleared like a snack pack`,
    stern:
      plannedOpen > 0
        ? ` · ${plannedOpen} commitments remain open — document carry-over`
        : ` · all stand-up items closed out`,
  })
  return (
    pSuffix(personality, {
      warm: `From stand up: ${plannedDone}/${plannedTotal} commitment${plannedTotal === 1 ? '' : 's'} marked done`,
      coach: `Stand-up plan: ${plannedDone}/${plannedTotal} marked done`,
      minimal: `${plannedDone}/${plannedTotal} done`,
      playful: `Morning bingo: ${plannedDone}/${plannedTotal} squares flipped`,
      stern: `Stand-up plan: ${plannedDone}/${plannedTotal} done`,
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
  const line = (
    rec: Record<ScrumMasterPersonality, { title: string; body: string }>,
  ): { title: string; body: string } => {
    const v = rec[personality] ?? rec.warm
    return { title: v.title.replace('{name}', name), body: v.body }
  }
  switch (key) {
    case 'su-10':
      return line({
        warm: W('{name} · Stand up soon', 'Stand up is in about ten minutes.'),
        coach: W('{name} · Stand up soon', 'Ten minutes — queue your top outcomes for today.'),
        minimal: W('{name} · Stand up', 'Ten minutes.'),
        playful: W('{name} · Stand up soon', 'Ten-minute trailer drop — stretch, hydrate, hype the day.'),
        stern: W('{name} · Stand up soon', 'Stand up in ten minutes. Be ready.'),
      })
    case 'su-5':
      return line({
        warm: W('{name} · Stand up', 'Five minutes until stand up.'),
        coach: W('{name} · Stand up', 'Five minutes — tighten scope to what can ship.'),
        minimal: W('{name} · Stand up', 'Five minutes.'),
        playful: W('{name} · Stand up', 'Five minutes until go-time — wiggle the jitters out.'),
        stern: W('{name} · Stand up', 'Five minutes to stand up.'),
      })
    case 'su-1':
      return line({
        warm: W('{name} · Stand up', 'One minute until stand up.'),
        coach: W('{name} · Stand up', 'One minute — open the app and breathe once.'),
        minimal: W('{name} · Stand up', 'One minute.'),
        playful: W('{name} · Stand up', 'Sixty-second drumroll — mic check for your day.'),
        stern: W('{name} · Stand up', 'One minute. Open poco.'),
      })
    case 'su-0':
      return line({
        warm: W('{name} · Stand up', 'Time for stand up — open poco when you are ready.'),
        coach: W('{name} · Stand up', 'Stand up window — open poco and name today’s commitments.'),
        minimal: W('{name} · Stand up', 'Stand up now.'),
        playful: W('{name} · Stand up', 'And… scene! Stand up is open — jump in whenever you are ready.'),
        stern: W('{name} · Stand up', 'Stand up. Open poco now.'),
      })
    case 'sd-30':
      return line({
        warm: W('{name} · Stand down', 'Stand down soon — start your end-of-day review.'),
        coach: W('{name} · Stand down', 'Stand down approaching — prep planned vs shipped notes.'),
        minimal: W('{name} · Stand down', 'Stand down soon.'),
        playful: W('{name} · Stand down', 'Half-hour trailer for the finale — gather receipts for what shipped.'),
        stern: W('{name} · Stand down', 'Stand down soon. Prepare review.'),
      })
    case 'sd-15':
      return line({
        warm: W('{name} · Stand down', 'Fifteen minutes until stand down.'),
        coach: W('{name} · Stand down', 'Fifteen minutes — capture carry-overs while fresh.'),
        minimal: W('{name} · Stand down', 'Fifteen minutes.'),
        playful: W('{name} · Stand down', 'Quarter-hour pep talk before the closing credits.'),
        stern: W('{name} · Stand down', 'Fifteen minutes to stand down.'),
      })
    case 'sd-5':
      return line({
        warm: W('{name} · Stand down', 'Five minutes until stand down.'),
        coach: W('{name} · Stand down', 'Five minutes — line up done vs planned.'),
        minimal: W('{name} · Stand down', 'Five minutes.'),
        playful: W('{name} · Stand down', 'Five minutes until the silly little awards show for your day.'),
        stern: W('{name} · Stand down', 'Five minutes to stand down.'),
      })
    case 'sd-1':
      return line({
        warm: W('{name} · Stand down', 'One minute until stand down.'),
        coach: W('{name} · Stand down', 'One minute — open poco for the review.'),
        minimal: W('{name} · Stand down', 'One minute.'),
        playful: W('{name} · Stand down', 'Sixty seconds to cue the “what actually happened” montage.'),
        stern: W('{name} · Stand down', 'One minute. Open poco.'),
      })
    case 'sd-0':
      return line({
        warm: W('{name} · Stand down', 'Time for stand down — review planned vs shipped today.'),
        coach: W('{name} · Stand down', 'Stand down — reconcile commitments vs completions.'),
        minimal: W('{name} · Stand down', 'Stand down now.'),
        playful: W('{name} · Stand down', 'Roll credits on today — stand down is open for hot takes and honest ticks.'),
        stern: W('{name} · Stand down', 'Stand down. Review the day now.'),
      })
    case 'su-after1':
      return line({
        warm: W('{name} · Stand up', 'Refine today’s commitments while context is fresh.'),
        coach: W('{name} · Stand up', 'Tighten commitments while memory is hot.'),
        minimal: W('{name} · Stand up', 'Refine commitments.'),
        playful: W('{name} · Stand up', 'Still in the opening credits — tweak your quest log while it feels fun.'),
        stern: W('{name} · Stand up', 'Refine today’s commitments now.'),
      })
    case 'sd-after1':
      return line({
        warm: W('{name} · Stand down', 'Log carry-overs and extra completions from today.'),
        coach: W('{name} · Stand down', 'Capture carry-over and off-plan completions from today.'),
        minimal: W('{name} · Stand down', 'Log carry-over & extras.'),
        playful: W('{name} · Stand down', 'Tag the cliffhangers and the bonus wins you sneaked in today.'),
        stern: W('{name} · Stand down', 'Log carry-over and off-plan work from today.'),
      })
  }
}
