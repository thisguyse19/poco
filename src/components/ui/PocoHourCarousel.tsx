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
}: {
  hour0to23: number
  onChange: (hour: number) => void
}) {
  const v = pad(hour0to23)
  return (
    <div className="min-h-[4.5rem]">
      <PocoScrollPicker
        compact
        value={v}
        options={HOURS}
        format={labelHour}
        onChange={(s) => onChange(Number(s))}
      />
    </div>
  )
}

function pad(n: number) {
  return String(Math.min(23, Math.max(0, n))).padStart(2, '0')
}
