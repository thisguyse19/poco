import { PocoMessageDialog } from '../ui/PocoMessageDialog'
import type { ReleaseNote } from '../../version'

export function PocoWhatsNewDialog({
  open,
  onClose,
  entries,
  heading = 'What is new',
}: {
  open: boolean
  onClose: () => void
  /** Pass `getReleaseNotesAfter(dismissedCode)` or full history via `getReleaseNotesAfter(0)`. */
  entries: ReleaseNote[]
  /** e.g. “Version history” when browsing from Settings */
  heading?: string
}) {
  return (
    <PocoMessageDialog
      open={open}
      title={heading}
      onClose={onClose}
      panelMaxWidthClass="max-w-md"
      panelClassName="max-h-[min(88dvh,520px)] overflow-hidden"
      panelRole="dialog"
      body={
        <div className="mt-3 max-h-[min(52dvh,380px)] overflow-y-auto pr-1 text-sm leading-snug text-[var(--text-secondary)] [-webkit-overflow-scrolling:touch]">
          {entries.length === 0 ? (
            <p className="text-[var(--text-tertiary)]">No release notes for this range.</p>
          ) : (
            <ul className="space-y-5">
              {entries.map((e) => (
                <li key={e.code} className="list-none">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {e.label} <span className="font-normal text-[var(--text-tertiary)]">· build {e.code}</span>
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">{e.date}</p>
                  <p className="mt-1 text-[var(--text-secondary)]">{e.title}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {e.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      }
    />
  )
}
