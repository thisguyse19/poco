import type { ScrumBannerView } from '../../utils/scrumMaster'

type Props = {
  name: string
  banner: ScrumBannerView
  onTapStart: () => void
}

export function ScrumMasterBanner({ name, banner, onTapStart }: Props) {
  if (!banner.visible) return null

  const isUp = banner.kind === 'standUp'
  const event = isUp ? 'stand up' : 'stand down'
  const dm = banner.deltaMinutes

  let line = ''
  if (dm < 0) {
    const m = Math.abs(dm)
    line = m <= 1 ? `Stand ${isUp ? 'up' : 'down'} is underway.` : `${m} minutes into your ${event}. Tap to open the flow.`
  } else if (dm === 0) {
    line = `Time for your ${event}. Tap here to start now.`
  } else if (dm <= 5) {
    line = `${dm} minute${dm === 1 ? '' : 's'} until your ${event}. Tap here to start now.`
  } else {
    line = `Almost time for your ${event}.`
  }

  return (
    <button
      type="button"
      onClick={onTapStart}
      className="poco-scrum-banner mb-3 w-full rounded-[var(--radius-sm)] border border-transparent bg-[var(--bg-base)] px-3 py-3 text-left shadow-sm"
    >
      <p className="font-serif text-base font-semibold leading-snug text-[var(--text-primary)]">
        <span className="poco-scrum-text-gradient">{name}</span> says…
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{line}</p>
    </button>
  )
}
