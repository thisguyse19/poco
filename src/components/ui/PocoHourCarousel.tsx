import { PocoScrollPicker } from './PocoScrollPicker'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

function labelHour(h: string) {
  const n = Number(h)
  const ap = n === 0 ? 'am' : n < 12 ? 'am' : 'pm'
  const h12 = n % 12 === 0 ? 12 : n % 12
  return `${h12} ${ap}`
}

export function PocoHourCarousel({
  hour0to23,
  onChange,
  variant = 'stack',
}: {
  hour0to23: number
  onChange: (hour: number) => void
  variant?: 'stack' | 'toolbar'
}) {
  const v = pad(hour0to23)
  const picker = (
    <PocoScrollPicker
      compact
      align={variant === 'toolbar' ? 'start' : 'center'}
      value={v}
      options={HOURS}
      format={labelHour}
      onChange={(s) => onChange(Number(s))}
    />
  )
  if (variant === 'toolbar') {
    return <div className="flex h-[2.75rem] max-w-[6.5rem] min-w-[5.25rem] items-stretch justify-end">{picker}</div>
  }
  return <div className="min-h-[4.5rem]">{picker}</div>
}

function pad(n: number) {
  return String(Math.min(23, Math.max(0, n))).padStart(2, '0')
}
