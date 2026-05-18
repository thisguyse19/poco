import type { ReactNode } from 'react'
import { pocoDialogTheme } from './pocoDialogTheme'

type Role = 'dialog' | 'alertdialog'

type PocoDialogPanelProps = {
  role?: Role
  labelledBy: string
  describedBy?: string
  children: ReactNode
  className?: string
}

export function PocoDialogPanel({
  role = 'dialog',
  labelledBy,
  describedBy,
  children,
  className = '',
}: PocoDialogPanelProps) {
  return (
    <div
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={`${pocoDialogTheme.panel} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}
