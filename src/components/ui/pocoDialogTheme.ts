/** Literal class strings for dialog panels (spec) */
export const pocoDialogTheme = {
  panel:
    'relative z-[1] w-full max-w-full rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 shadow-xl',
  title: 'text-base font-semibold tracking-tight text-[var(--text-primary)]',
  description: 'mt-2 text-sm leading-relaxed text-[var(--text-secondary)]',
  actions: 'mt-6 flex flex-wrap justify-end gap-2',
  btnSecondary:
    'poco-press h-10 min-w-[4.5rem] rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]',
  btnAccent:
    'poco-press h-10 min-w-[4.5rem] rounded-[var(--radius-sm)] border border-transparent bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--text-inverse)] hover:bg-[var(--accent-hover)]',
  btnDanger:
    'poco-press h-10 min-w-[4.5rem] rounded-[var(--radius-sm)] border border-transparent bg-[var(--priority-high)] px-4 text-sm font-semibold text-white hover:opacity-90',
} as const
