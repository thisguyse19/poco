type IconName =
  | 'check'
  | 'plus'
  | 'pin'
  | 'trash'
  | 'edit'
  | 'timer'
  | 'focus'
  | 'settings'
  | 'tasks'
  | 'chevron-down'
  | 'chevron-right'
  | 'x'
  | 'arrow-left'
  | 'sun'
  | 'moon'
  | 'circle'
  | 'calendar'
  | 'flag'
  | 'more-h'
  | 'flame'
  | 'search'

export function Icon({
  name,
  size = 18,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const s = { width: size, height: size, display: 'block' } as const
  const stroke = 'currentColor'
  const common = { fill: 'none', stroke, strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (name) {
    case 'check':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M5 12l4 4L19 7" />
        </svg>
      )
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'pin':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M12 17v5M9 3h6l2 5-4 3v6" />
        </svg>
      )
    case 'trash':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V5h6v2" />
        </svg>
      )
    case 'edit':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" />
        </svg>
      )
    case 'timer':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <circle cx="12" cy="13" r="8" {...common} />
          <path {...common} d="M12 9v5l3 2M9 3h6" />
        </svg>
      )
    case 'focus':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <circle cx="12" cy="12" r="3" {...common} />
          <path {...common} d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
        </svg>
      )
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <circle cx="12" cy="12" r="3" {...common} />
          <path
            {...common}
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      )
    case 'tasks':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" />
        </svg>
      )
    case 'chevron-down':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M6 9l6 6 6-6" />
        </svg>
      )
    case 'chevron-right':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M9 6l6 6-6 6" />
        </svg>
      )
    case 'x':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M6 6l12 12M18 6L6 18" />
        </svg>
      )
    case 'arrow-left':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M15 5l-7 7 7 7" />
        </svg>
      )
    case 'sun':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <circle cx="12" cy="12" r="4" {...common} />
          <path {...common} d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
        </svg>
      )
    case 'moon':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M21 14.5A8.5 8.5 0 0110.5 4 8.5 8.5 0 0014.5 21 8.5 8.5 0 0021 14.5z" />
        </svg>
      )
    case 'circle':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <circle cx="12" cy="12" r="9" {...common} />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" {...common} />
          <path {...common} d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      )
    case 'flag':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path {...common} d="M5 3v18M5 5h12l-2 4 2 4H5" />
        </svg>
      )
    case 'more-h':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <circle cx="6" cy="12" r="1.5" fill={stroke} stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill={stroke} stroke="none" />
          <circle cx="18" cy="12" r="1.5" fill={stroke} stroke="none" />
        </svg>
      )
    case 'flame':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <path
            {...common}
            d="M12 22c4-2 6-5 6-9 0-4-3-7-6-10-3 3-6 6-6 10 0 4 2 7 6 9z"
          />
        </svg>
      )
    case 'search':
      return (
        <svg viewBox="0 0 24 24" style={s} className={className} aria-hidden>
          <circle cx="10.5" cy="10.5" r="6.5" {...common} />
          <path {...common} d="M15 15l6 6" />
        </svg>
      )
    default:
      return <span style={s} className={className} />
  }
}
