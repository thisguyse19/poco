import { useEffect, useRef } from 'react'
import { Icon } from '../ui/Icon'

type Props = {
  open: boolean
  query: string
  onOpenChange: (open: boolean) => void
  onQueryChange: (q: string) => void
}

export function HomeSearchControl({ open, query, onOpenChange, onQueryChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <div className="pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-20 flex max-w-[min(calc(100vw-1.5rem),22rem)] items-stretch justify-end md:right-5">
      <div
        className={`pointer-events-auto flex max-w-full flex-row-reverse items-stretch overflow-hidden rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-sm transition-[max-width] duration-300 [transition-timing-function:var(--ease-ios)] ${
          open ? 'w-[min(calc(100vw-2rem),20rem)]' : 'w-10'
        }`}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close search' : 'Search'}
          className="poco-press flex h-10 w-10 shrink-0 items-center justify-center text-[var(--text-secondary)]"
          onClick={() => {
            if (open && query) onQueryChange('')
            onOpenChange(!open)
          }}
        >
          <Icon name="search" size={18} />
        </button>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoCapitalize="sentences"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search"
          className={`poco-input h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent text-sm outline-none transition-[opacity,padding] duration-300 [transition-timing-function:var(--ease-ios)] ${
            open ? 'px-3 opacity-100' : 'w-0 max-w-0 px-0 opacity-0'
          }`}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
        />
      </div>
    </div>
  )
}
