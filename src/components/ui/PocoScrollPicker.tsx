import { useCallback, useId, useLayoutEffect, useMemo, useRef } from 'react'

const ROW_DEFAULT = 28
const VISIBLE_DEFAULT = 84
const ROW_COMPACT = 24
const VISIBLE_COMPACT = 72

type PocoScrollPickerProps<T extends string | number> = {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  format?: (v: T) => string
  /** Tighter wheel for side-by-side layouts */
  compact?: boolean
}

export function PocoScrollPicker<T extends string | number>({
  value,
  options,
  onChange,
  format = (v) => String(v),
  compact = false,
}: PocoScrollPickerProps<T>) {
  const row = compact ? ROW_COMPACT : ROW_DEFAULT
  const visibleH = compact ? VISIBLE_COMPACT : VISIBLE_DEFAULT
  const pad = (visibleH - row) / 2
  const uid = useId()
  const ref = useRef<HTMLDivElement>(null)
  const skipScroll = useRef(false)
  const debounce = useRef<number>(0)

  const index = useMemo(() => {
    const i = options.indexOf(value)
    return i < 0 ? 0 : i
  }, [options, value])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || skipScroll.current) {
      skipScroll.current = false
      return
    }
    el.scrollTo({ top: index * row, behavior: 'auto' })
  }, [index, value, row])

  const onScrollEnd = useCallback(() => {
    const el = ref.current
    if (!el) return
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => {
      const idx = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / row)))
      const targetTop = idx * row
      el.scrollTo({ top: targetTop, behavior: 'smooth' })
      const next = options[idx]
      if (next !== undefined && next !== value) {
        skipScroll.current = true
        onChange(next)
      }
    }, 120)
  }, [onChange, options, value, row])

  return (
    <div className="relative flex-1 min-w-0">
      <div
        ref={ref}
        className="poco-scrollbar-none snap-y snap-proximity overflow-y-auto"
        style={{
          height: visibleH,
          scrollPaddingTop: pad,
          scrollPaddingBottom: pad,
        }}
        onScroll={onScrollEnd}
      >
        <div style={{ height: pad }} aria-hidden />
        {options.map((opt, i) => {
          const selected = opt === value
          return (
            <button
              key={`${uid}-${i}`}
              type="button"
              className={`flex w-full items-center justify-center font-medium ${
                compact ? 'h-[24px] text-xs' : 'h-[28px] text-sm'
              } ${selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}
              style={{ height: row }}
              onClick={() => {
                skipScroll.current = true
                onChange(opt)
              }}
            >
              {format(opt)}
            </button>
          )
        })}
        <div style={{ height: pad }} aria-hidden />
      </div>
      <div
        className={`pointer-events-none absolute left-0 right-0 top-1/2 z-[1] -translate-y-1/2 border-y border-[var(--border-subtle)] bg-[var(--bg-elevated)]/55 ${
          compact ? 'h-[24px]' : 'h-[28px]'
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-[2] bg-gradient-to-b from-[var(--bg-elevated)] via-[var(--bg-elevated)]/85 to-transparent ${
          compact ? 'h-[22px]' : 'h-[26px]'
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-[var(--bg-elevated)] via-[var(--bg-elevated)]/85 to-transparent ${
          compact ? 'h-[22px]' : 'h-[26px]'
        }`}
        aria-hidden
      />
    </div>
  )
}
