import { useCallback, useId, useLayoutEffect, useMemo, useRef } from 'react'

const ROW = 28
const VISIBLE_H = 84
const PAD = (VISIBLE_H - ROW) / 2

type PocoScrollPickerProps<T extends string | number> = {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  format?: (v: T) => string
}

export function PocoScrollPicker<T extends string | number>({
  value,
  options,
  onChange,
  format = (v) => String(v),
}: PocoScrollPickerProps<T>) {
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
    el.scrollTo({ top: index * ROW, behavior: 'auto' })
  }, [index, value])

  const onScrollEnd = useCallback(() => {
    const el = ref.current
    if (!el) return
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => {
      const idx = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)))
      const targetTop = idx * ROW
      el.scrollTo({ top: targetTop, behavior: 'smooth' })
      const next = options[idx]
      if (next !== undefined && next !== value) {
        skipScroll.current = true
        onChange(next)
      }
    }, 120)
  }, [onChange, options, value])

  return (
    <div className="relative flex-1 min-w-0">
      <div
        ref={ref}
        className="poco-scrollbar-none snap-y snap-proximity overflow-y-auto"
        style={{
          height: VISIBLE_H,
          scrollPaddingTop: PAD,
          scrollPaddingBottom: PAD,
        }}
        onScroll={onScrollEnd}
      >
        <div style={{ height: PAD }} aria-hidden />
        {options.map((opt, i) => {
          const selected = opt === value
          return (
            <button
              key={`${uid}-${i}`}
              type="button"
              className={`flex h-[28px] w-full items-center justify-center text-sm font-medium ${
                selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
              }`}
              style={{ height: ROW }}
              onClick={() => {
                skipScroll.current = true
                onChange(opt)
              }}
            >
              {format(opt)}
            </button>
          )
        })}
        <div style={{ height: PAD }} aria-hidden />
      </div>
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 z-[1] h-[28px] -translate-y-1/2 border-y border-[var(--border-subtle)] bg-[var(--bg-elevated)]/55"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[26px] bg-gradient-to-b from-[var(--bg-elevated)] via-[var(--bg-elevated)]/85 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[26px] bg-gradient-to-t from-[var(--bg-elevated)] via-[var(--bg-elevated)]/85 to-transparent"
        aria-hidden
      />
    </div>
  )
}
