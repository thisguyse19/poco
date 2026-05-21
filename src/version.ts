/**
 * Monotonic build identity for poco. **Bump `POCO_VERSION_CODE` (and usually `POCO_VERSION_LABEL`)
 * on every merge to `main`.** Add a matching entry at the top of `POCO_RELEASE_HISTORY`.
 *
 * The Vite build rewrites `dist/sw.js` so the service worker cache name includes this code; that
 * forces browsers to treat each deploy as an update when using “Check for app update”.
 */
export const POCO_VERSION_CODE = 24

/** User-visible semver-style label (keep roughly in sync with `package.json` version). */
export const POCO_VERSION_LABEL = '1.1.13'

export type ReleaseNote = {
  code: number
  label: string
  date: string
  title: string
  bullets: string[]
}

/** Newest release first. Each entry’s `code` must match a shipped `POCO_VERSION_CODE`. */
export const POCO_RELEASE_HISTORY: ReleaseNote[] = [
  {
    code: 24,
    label: '1.1.13',
    date: '2026-05-20',
    title: 'Tomorrow rolls to Today; aligned task grids',
    bullets: [
      'Tasks tagged Tomorrow move to Today when the local calendar advances (on load, each minute while open, and when returning to the tab).',
      'Desktop Today categories stack full width so each section uses the same multi-column task grid as Inbox, Tomorrow, Someday, and Done.',
    ],
  },
  {
    code: 23,
    label: '1.1.12',
    date: '2026-05-20',
    title: 'Tasks: category sections always on Today',
    bullets: [
      'Removed the Scrum “flat today” layout that hid collapsible categories for most of the day when Scrum Master was enabled.',
      'The optional gather-into-SM prompt still appears during the inline day phase when it applies.',
    ],
  },
  {
    code: 22,
    label: '1.1.11',
    date: '2026-05-20',
    title: 'Scrum rhythm after rescheduling',
    bullets: [
      'Changing daily stand-up or stand-down times clears today’s “already finished” session guards so the Tasks home banner and SM section match the new schedule right away.',
    ],
  },
  {
    code: 21,
    label: '1.1.10',
    date: '2026-05-19',
    title: 'Simpler app icon + reliable icon URLs',
    bullets: [
      'PWA manifest and apple-touch links in index.html use the Vite base URL placeholder so they resolve after build.',
      'Sidebar and notification icons point at poco/icons under the same base, matching public/poco/icons in dist.',
      'Manifest icon paths stay relative to the manifest file.',
      'Removed the separate tab favicon link; the mark is a calmer rounded note frame.',
    ],
  },
  {
    code: 20,
    label: '1.1.9',
    date: '2026-05-19',
    title: 'Scrum timing accuracy + cooler focus ticks',
    bullets: [
      'Tasks / Ahead wall clocks tick on each real minute (and pause when hidden) so Scrum banners and collection windows align with minute-based thresholds.',
      'Scrum local notifications use the same minute-aligned schedule while visible.',
      'Focus timer wall sync 2s and persist 5s for fewer wakeups while the phase clock stays exact via phaseEndsAt.',
    ],
  },
  {
    code: 19,
    label: '1.1.8',
    date: '2026-05-19',
    title: 'PWA battery: quieter timers in background',
    bullets: [
      'Focus timer: 1 Hz wall sync instead of requestAnimationFrame; pause ticks while the tab is hidden; stop writing storage every animation frame.',
      'Scrum local reminders: at most once per minute while visible; pause in background.',
      'Home / Ahead clocks and SW update probe pause when hidden; undo toast ring ticks at 250 ms.',
      'Week page flip-hold uses requestAnimationFrame instead of a 32 ms interval.',
    ],
  },
  {
    code: 18,
    label: '1.1.7',
    date: '2026-05-19',
    title: 'Dialog enter motion + wide release notes centred',
    bullets: [
      'Centre modals fade and scale in again after `open` (single requestAnimationFrame tick; reduced motion stays instant).',
      'Dialog panels use max-width from the animated shell only so What is new / version history match other modals horizontally.',
    ],
  },
  {
    code: 17,
    label: '1.1.6',
    date: '2026-05-19',
    title: 'Centre modals actually fixed to the viewport',
    bullets: [
      'Remove conflicting `relative` + `fixed` on the dialog shell: Tailwind’s CSS order made `relative` win, so portaled modals sat in document flow under `#root` and never appeared on screen.',
    ],
  },
  {
    code: 16,
    label: '1.1.5',
    date: '2026-05-19',
    title: 'Centre modal visibility fix',
    bullets: [
      'Dialogs (Scrum edit, personality info, confirms) show as soon as they are open: opacity no longer waits on a separate mounted flag that could lag behind `open`.',
      'Backdrop stays interactive during the exit fade so taps do not leak to the page underneath.',
    ],
  },
  {
    code: 15,
    label: '1.1.4',
    date: '2026-05-19',
    title: 'Dialogs above chrome, new app icon',
    bullets: [
      'Version history and What is new reliably paint above the tab bar, update toast, and undo bar (higher z-index).',
      'Centre modal keeps the portal mounted whenever the dialog is open so it cannot render “invisible”.',
      'What is new gate opens synchronously after onboarding (no requestAnimationFrame that Strict Mode could cancel).',
      'Warmer paper-style PWA icon with sage motif; sidebar uses the same mark. Regenerate PNGs from public/poco/icons/icon-source.svg via npm run icons.',
    ],
  },
  {
    code: 14,
    label: '1.1.3',
    date: '2026-05-19',
    title: 'Release dialogs visible again',
    bullets: [
      'What is new and version history use the same modal shell as the rest of the app.',
      'Fix centre modal enter animation so the panel is not stuck invisible after a fast open.',
    ],
  },
  {
    code: 13,
    label: '1.1.2',
    date: '2026-05-19',
    title: 'PWA modal centre + version history order',
    bullets: [
      'Centre modals reliably on installed PWA (width no longer stretches to full viewport; safe-area padding).',
      'Version history and What is new list newest builds first.',
    ],
  },
  {
    code: 12,
    label: '1.1.1',
    date: '2026-05-19',
    title: 'What is new after updates, centred release dialog',
    bullets: [
      'Centre modal panels correctly (version history and What is new).',
      'Completing a service-worker update now always opens What is new once on the next load.',
    ],
  },
  {
    code: 11,
    label: '1.1.0',
    date: '2026-05-19',
    title: 'Versioning, updates, and release notes',
    bullets: [
      'Internal build number increases on every release so "Check for app update" detects new deploys.',
      'After updating, a What is new dialog can summarize what changed since your last visit.',
      'Settings → About shows the current version and full version history.',
      'Editable profile name from Settings on all devices; service worker scope fixes for GitHub Pages.',
    ],
  },
]

/** Entries with `code` greater than `afterCode`, newest first (for version history and What is new). */
export function getReleaseNotesAfter(afterCode: number): ReleaseNote[] {
  return [...POCO_RELEASE_HISTORY].filter((e) => e.code > afterCode).sort((a, b) => b.code - a.code)
}
