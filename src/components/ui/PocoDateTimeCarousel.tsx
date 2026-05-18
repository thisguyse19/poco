import { toLocalISODate } from '../../services/storage'
import { PocoScrollPicker } from './PocoScrollPicker'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function monthMmm(m: string) {
  return new Date(2000, Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short' })
}

type DueChange = { dueDate: string | null; dueTime: string | null }

export function PocoDueDateTimeRow({
  dueDate,
  dueTime,
  onChange,
}: {
  dueDate: string | null
  dueTime: string | null
  onChange: (next: DueChange) => void
}) {
  const iso = dueDate ?? toLocalISODate()
  const [dy, dm, dd] = iso.split('-').map((x) => x.padStart(2, '0'))
  const dim = new Date(Number(dy), Number(dm), 0).getDate()
  const days = Array.from({ length: dim }, (_, i) => String(i + 1).padStart(2, '0'))
  const y0 = new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => String(y0 - 3 + i))

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const timeStr = dueTime ?? '09:00'
  const [th, tm] = timeStr.split(':').map((x) => (x ?? '00').padStart(2, '0'))

  return (
    <div className="flex min-h-0 flex-row items-stretch gap-2">
      <div className="flex min-h-0 min-w-0 flex-[1.12] gap-0.5">
        <PocoScrollPicker
          prominent
          value={dd}
          options={days}
          onChange={(v) => {
            const day = Math.min(Number(v), new Date(Number(dy), Number(dm), 0).getDate())
            onChange({ dueDate: `${dy}-${dm}-${pad2(day)}`, dueTime })
          }}
          format={(x) => String(Number(x))}
        />
        <PocoScrollPicker
          prominent
          value={dm}
          options={months}
          format={monthMmm}
          onChange={(v) => {
            const dim2 = new Date(Number(dy), Number(v) - 1, 0).getDate()
            const day = Math.min(Number(dd), dim2)
            onChange({ dueDate: `${dy}-${v}-${pad2(day)}`, dueTime })
          }}
        />
        <PocoScrollPicker
          prominent
          value={dy}
          options={years}
          onChange={(v) => {
            const dim2 = new Date(Number(v), Number(dm) - 1, 0).getDate()
            const day = Math.min(Number(dd), dim2)
            onChange({ dueDate: `${v}-${dm}-${pad2(day)}`, dueTime })
          }}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-0.5 border-l border-[var(--border-subtle)] pl-2">
        <PocoScrollPicker
          prominent
          value={th}
          options={Array.from({ length: 24 }, (_, i) => pad2(i))}
          onChange={(h) =>
            onChange({
              dueDate: dueDate ?? toLocalISODate(),
              dueTime: `${h}:${tm}`,
            })
          }
        />
        <span className="flex w-3 shrink-0 items-center justify-center pb-0.5 text-lg font-semibold leading-none text-[var(--text-tertiary)]">
          :
        </span>
        <PocoScrollPicker
          prominent
          value={tm}
          options={Array.from({ length: 60 }, (_, i) => pad2(i))}
          onChange={(m) =>
            onChange({
              dueDate: dueDate ?? toLocalISODate(),
              dueTime: `${th}:${m}`,
            })
          }
        />
      </div>
    </div>
  )
}
