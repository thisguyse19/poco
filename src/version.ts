/**
 * Monotonic build identity for poco. **Bump `POCO_VERSION_CODE` (and usually `POCO_VERSION_LABEL`)
 * on every merge to `main`.** Add a matching entry at the top of `POCO_RELEASE_HISTORY`.
 *
 * The Vite build rewrites `dist/sw.js` so the service worker cache name includes this code; that
 * forces browsers to treat each deploy as an update when using “Check for app update”.
 */
export const POCO_VERSION_CODE = 15

/** User-visible semver-style label (keep roughly in sync with `package.json` version). */
export const POCO_VERSION_LABEL = '1.1.4'

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
