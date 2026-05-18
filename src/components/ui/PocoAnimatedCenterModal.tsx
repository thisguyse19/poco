import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const DURATION = 320
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

function useReduceMotion() {
  return typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true'
}

/**
 * Centered alert / confirm shell with iOS-style scale + fade (enter and exit).
 */
export function PocoAnimatedCenterModal({
  open,
  onBackdropClick,
  children,
}: {
  open: boolean
  onBackdropClick?: () => void
  children: ReactNode
}) {
  const reduceMotion = useReduceMotion()
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const ms = reduceMotion ? 1 : DURATION

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- staged mount for modal animation
      setMounted(true)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
  }, [open])

  /** If transitionend never fires (e.g. reduced-motion / iOS), avoid a full-screen invisible layer blocking the app. */
  useEffect(() => {
    if (!open && mounted) {
      const t = window.setTimeout(() => setMounted(false), ms + 150)
      return () => window.clearTimeout(t)
    }
  }, [open, mounted, ms])

  const onPanelTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== panelRef.current) return
    if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return
    if (!open) setMounted(false)
  }

  if (!mounted) return null

  const show = entered && open
  const transition = `opacity ${ms}ms ${EASE}, transform ${ms}ms ${EASE}`

  return createPortal(
    <div
      className={`fixed inset-0 z-[var(--poco-z-dialog-backdrop)] flex items-center justify-center p-4 max-md:pb-[var(--poco-mobile-nav-height)] md:p-6 ${
        show ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
        style={{
          opacity: show ? 1 : 0,
          transition,
          transitionTimingFunction: EASE,
          pointerEvents: show ? 'auto' : 'none',
        }}
        onClick={onBackdropClick}
      />
      <div
        ref={panelRef}
        className="relative z-[var(--poco-z-dialog-panel)] w-full max-w-sm"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 14px, 0) scale(0.96)',
          transition,
          willChange: 'opacity, transform',
        }}
        onTransitionEnd={onPanelTransitionEnd}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
