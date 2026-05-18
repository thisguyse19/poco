import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

type Align = 'center' | 'bottom'

type PocoModalProps = {
  open: boolean
  onBackdropClick?: () => void
  children: ReactNode
  align?: Align
  /** When true, backdrop does not cover mobile bottom tab bar */
  clearBottomNavOnMobile?: boolean
  backdropBlur?: boolean
  backdropClassName?: string
  className?: string
}

export function PocoModal({
  open,
  onBackdropClick,
  children,
  align = 'center',
  clearBottomNavOnMobile = false,
  backdropBlur = false,
  backdropClassName = '',
  className = '',
}: PocoModalProps) {
  if (!open) return null

  const navSafe = clearBottomNavOnMobile
    ? 'left-0 right-0 top-0 bottom-0 max-md:bottom-[var(--poco-mobile-nav-height)]'
    : 'inset-0'

  const flexAlign =
    align === 'bottom'
      ? 'items-end justify-center pb-0 md:items-center md:pb-8'
      : 'items-center justify-center p-4'

  return createPortal(
    <div
      className={`fixed inset-0 z-[110] flex ${flexAlign} animate-fadeIn ${className}`}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className={`absolute ${navSafe} bg-black/30 transition-opacity duration-150 ${backdropBlur ? 'backdrop-blur-[1px]' : ''} ${backdropClassName}`}
        onClick={onBackdropClick}
      />
      {children}
    </div>,
    document.body,
  )
}
