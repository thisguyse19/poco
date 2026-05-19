import { PocoScrollPicker } from './PocoScrollPicker'

const OPTIONS = Array.from({ length: 24 }, (_, i) => String((i + 1) * 5)) as readonly string[]

function clamp5to120(n: number) {
  const s = Math.round(n / 5) * 5
  return Math.min(120, Math.max(5, s))
}

export function PocoFocusMinutesCarousel({
  minutes,
  onChange,
  variant = 'stack',
}: {
  minutes: number
  onChange: (m: number) => void
  variant?: 'stack' | 'toolbar'
}) {
  const v = String(clamp5to120(minutes))
  const picker = (
    <PocoScrollPicker
      compact
      align="start"
      value={v}
      options={OPTIONS}
      format={(x) => `${x} min`}
      onChange={(s) => onChange(Number(s))}
    />
  )
  if (variant === 'toolbar') {
    // Match PocoScrollPicker compact viewport (84px); shorter parent clips the wheel.
    return <div className="flex h-[84px] max-w-[6.5rem] min-w-[5rem] shrink-0 items-stretch justify-end">{picker}</div>
  }
  return <div className="flex min-h-[5.25rem] max-w-[7rem] items-stretch">{picker}</div>
}
