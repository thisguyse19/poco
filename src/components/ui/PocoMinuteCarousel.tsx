import { PocoScrollPicker } from './PocoScrollPicker'

const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')) as readonly string[]

export function PocoMinuteCarousel({
  minute0to55Step5,
  onChange,
  variant = 'stack',
}: {
  minute0to55Step5: number
  onChange: (m: number) => void
  variant?: 'stack' | 'toolbar'
}) {
  const v = pad(minute0to55Step5)
  const picker = (
    <PocoScrollPicker
      compact
      align={variant === 'toolbar' ? 'start' : 'center'}
      value={v}
      options={MINS}
      format={(s) => `${s}m`}
      onChange={(s) => onChange(Number(s))}
    />
  )
  if (variant === 'toolbar') {
    return <div className="flex h-[72px] max-w-[5.5rem] min-w-[4.5rem] shrink-0 items-stretch justify-end">{picker}</div>
  }
  return <div className="min-h-[4.5rem]">{picker}</div>
}

function pad(n: number) {
  const s = Math.round(n / 5) * 5
  const c = Math.min(55, Math.max(0, s))
  return String(c).padStart(2, '0')
}
