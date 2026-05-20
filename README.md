# poco

Local-first tasks and Pomodoro PWA. Built with React 19, Vite 8, Tailwind CSS 4, and Zustand. Deploy under the `/poco/` base path (for example GitHub Pages).

## Scripts

- `npm run dev` — start Vite
- `npm run build` — TypeScript project build plus production bundle
- `npm run lint` — ESLint
- `npm run preview` — preview the production build

## Data

All state is stored in `localStorage` under the `poco:*` keys. Use Settings to export, import, or clear data.

## Releases and versioning

Each deploy must bump the internal build in **`src/version.ts`** (`POCO_VERSION_CODE` and a row in `POCO_RELEASE_HISTORY`). The production build patches the service worker so updates are detectable. See **`CONTRIBUTING.md`** for the full merge checklist.
