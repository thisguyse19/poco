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
  const wrapRef = useRef<HTMLDivElement>(null)
  const q = query.trim()
  const expanded = open || q.length > 0

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const collapseIfBlurred = () => {
    requestAnimationFrame(() => {
      const el = wrapRef.current
      if (!el?.contains(document.activeElement)) {
        onOpenChange(false)
      }
    })
  }

  const clearAndCollapse = () => {
    onQueryChange('')
    onOpenChange(false)
    inputRef.current?.blur()
  }

  return (
    <div ref={wrapRef} className="pointer-events-none flex w-full justify-end">
      <div
        className={`pointer-events-auto flex max-w-full flex-row items-stretch overflow-hidden rounded-none border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-sm transition-[max-width] duration-[400ms] [transition-timing-function:var(--ease-ios)] ${
          expanded ? 'w-full max-w-full' : 'w-10 max-w-[2.5rem]'
        }`}
      >
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoCapitalize="sentences"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onBlur={collapseIfBlurred}
          placeholder="Search"
          className={`poco-input h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent text-sm outline-none transition-[opacity,padding,max-width] duration-[400ms] [transition-timing-function:var(--ease-ios)] ${
            expanded ? 'max-w-full px-3 opacity-100' : 'max-w-0 px-0 opacity-0'
          }`}
          tabIndex={expanded ? 0 : -1}
          aria-hidden={!expanded}
        />
        {q ? (
          <button
            type="button"
            aria-label="Clear search"
            className="poco-press flex h-10 shrink-0 items-center pr-1"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearAndCollapse}
          >
            <span className="flex h-6 items-center rounded-none border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-1.5 text-[var(--accent)]">
              <Icon name="x" size={14} />
            </span>
          </button>
        ) : null}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close search' : 'Search'}
          className="poco-press flex h-10 w-10 shrink-0 items-center justify-center text-[var(--text-secondary)]"
          onMouseDown={(e) => {
            if (open) e.preventDefault()
          }}
          onClick={() => {
            if (open) {
              onOpenChange(false)
              inputRef.current?.blur()
            } else {
              onOpenChange(true)
            }
          }}
        >
          <Icon name="search" size={18} />
        </button>
      </div>
    </div>
  )
}
