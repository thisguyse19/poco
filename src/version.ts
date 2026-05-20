/**
 * Monotonic build identity for poco. **Bump `POCO_VERSION_CODE` (and usually `POCO_VERSION_LABEL`)
 * on every merge to `main`.** Add a matching entry at the top of `POCO_RELEASE_HISTORY`.
 *
 * The Vite build rewrites `dist/sw.js` so the service worker cache name includes this code; that
 * forces browsers to treat each deploy as an update when using “Check for app update”.
 */
export const POCO_VERSION_CODE = 11

/** User-visible semver-style label (keep roughly in sync with `package.json` version). */
export const POCO_VERSION_LABEL = '1.1.0'

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

/** Entries newer than `afterCode` (for What’s new since last dismissed). */
export function getReleaseNotesAfter(afterCode: number): ReleaseNote[] {
  return [...POCO_RELEASE_HISTORY].filter((e) => e.code > afterCode).sort((a, b) => a.code - b.code)
}
