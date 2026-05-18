# Motion and animation standards

All new UI work in this project must treat motion as a first-class part of the experience, not an afterthought.

## Principles

1. **iOS-like restraint** — Prefer short, eased transitions (opacity, transform, width or max-width) over flashy or bouncy effects. Motion should feel calm and intentional.

2. **Purpose** — Every animation answers a question: where did that element come from, where did it go, or what changed? If it does not aid understanding, remove it or shorten it.

3. **Non-distracting** — Avoid looping attention-grabbers, large parallax, or simultaneous competing transitions. One focal transition at a time is enough.

4. **Respect reduced motion** — When the user prefers reduced motion (`prefers-reduced-motion: reduce`), provide instant state changes or minimal fades. Do not rely on motion alone to convey required information.

5. **Performance** — Prefer properties that composite well (`opacity`, `transform`) over layout-thrashing properties where possible. Keep durations modest (roughly 200–400 ms for most UI chrome unless product spec says otherwise).

6. **Continuity** — Sheets, modals, and expanding controls should feel physically connected to their triggers (e.g. sheets anchored above the tab bar, search expanding to align with list width).

## Implementation hints

- Reuse shared timing tokens or CSS variables such as `--ease-ios` where they already exist in the codebase.
- Collapse expanded UI when focus leaves an input, when appropriate, so the layout does not stay “stuck” open without user intent.

These rules apply to **all** features developed from here on unless an explicit exception is documented in the pull request.
