import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const DURATION = 320
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

function useReduceMotion() {
  return typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true'
}

/**
 * Centered alert / confirm shell with iOS-style scale + fade (enter and exit).
 * Panel width uses `calc(100vw-2rem)` with `panelMaxWidthClass` so PWAs do not stretch edge-to-edge
 * (which prevented horizontal centre). Overlay uses `min-h-dvh` and safe-area padding instead of tab-bar padding.
 *
 * Renders the portal whenever `open || mounted` so exit transitions can finish before unmounting.
 *
 * **Enter animation:** after `open` becomes true, one `requestAnimationFrame` flips `entered` so the first
 * paint can use opacity 0 / offset scale, then transition into place. `reduceMotion` skips the rAF hop.
 * **Do not use a double-rAF** here: Strict Mode cleanup only cancels the outer id and can strand `entered`.
 *
 * **Do not add `relative` alongside `fixed` on this root:** Tailwind emits `.relative` after `.fixed` in the stylesheet,
 * so `position: relative` wins and the overlay stays in normal flow below `#root` — modals render off-screen.
 */
export function PocoAnimatedCenterModal({
  open,
  onBackdropClick,
  children,
  panelMaxWidthClass = 'max-w-sm',
}: {
  open: boolean
  onBackdropClick?: () => void
  children: ReactNode
  panelMaxWidthClass?: string
}) {
  const reduceMotion = useReduceMotion()
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(open)
  const panelRef = useRef<HTMLDivElement>(null)
  const prevOpenRef = useRef(open)
  const ms = reduceMotion ? 1 : DURATION

  /* eslint-disable react-hooks/set-state-in-effect -- open/close choreography + rAF enter tick */
  useLayoutEffect(() => {
    if (!open) {
      setEntered(false)
      prevOpenRef.current = false
      return
    }

    setMounted(true)

    const wasAlreadyOpen = prevOpenRef.current === true
    prevOpenRef.current = true

    if (wasAlreadyOpen) {
      setEntered(true)
      return
    }

    if (reduceMotion) {
      setEntered(true)
      return
    }

    setEntered(false)
    const id = requestAnimationFrame(() => {
      setEntered(true)
    })
    return () => cancelAnimationFrame(id)
  }, [open, reduceMotion])
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const shouldRender = open || mounted
  if (!shouldRender) return null

  const visualsOpen = reduceMotion ? open : open && entered
  const transition = `opacity ${ms}ms ${EASE}, transform ${ms}ms ${EASE}`

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--poco-z-dialog-backdrop)] flex min-h-dvh items-center justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pointer-events-auto"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 z-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
        style={{
          opacity: visualsOpen ? 1 : 0,
          transition,
          transitionTimingFunction: EASE,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onBackdropClick}
      />
      <div
        ref={panelRef}
        className={`relative z-[var(--poco-z-dialog-panel)] mx-auto w-[calc(100vw-2rem)] ${panelMaxWidthClass} shrink-0 self-center ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{
          opacity: visualsOpen ? 1 : 0,
          transform: visualsOpen ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 14px, 0) scale(0.96)',
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
