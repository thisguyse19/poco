# Contributing to poco

## Release / merge checklist (required)

Every merge to `main` that produces a deployable build **must**:

1. Open **`src/version.ts`**.
2. Increment **`POCO_VERSION_CODE`** by one (integer, never reuse).
3. Set **`POCO_VERSION_LABEL`** if you are cutting a new user-facing semver (keep roughly aligned with `package.json` `version`).
4. Prepend a **`POCO_RELEASE_HISTORY`** entry (same `code` as `POCO_VERSION_CODE`) with a short title and bullet notes.

The Vite build reads `POCO_VERSION_CODE` and rewrites **`dist/sw.js`** so the service worker cache name and file bytes change. Without this step, browsers will not see a new worker after deploy and **Check for app update** will report up to date incorrectly.

Optional: run `npm run build` locally before pushing.
