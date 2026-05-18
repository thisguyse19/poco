import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  rightSlot?: ReactNode
  /** Extra right padding when a floating control (e.g. search) sits in the corner */
  searchClearance?: boolean
  className?: string
  /** e.g. dev unlock tap sequence on Settings */
  onTitleClick?: () => void
}

export function PageHeader({
  title,
  subtitle,
  rightSlot,
  searchClearance = false,
  className = '',
  onTitleClick,
}: PageHeaderProps) {
  const endPad = searchClearance ? 'pr-14 md:pr-16' : 'pr-4 md:pr-6'
  return (
    <header
      className={`flex min-h-[var(--poco-page-header-min)] shrink-0 items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-6 ${endPad} ${className}`}
    >
      <div className="min-w-0">
        <h1
          className={`font-serif text-2xl md:text-3xl ${onTitleClick ? 'cursor-default select-none' : ''}`}
          onClick={onTitleClick}
        >
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </header>
  )
}
