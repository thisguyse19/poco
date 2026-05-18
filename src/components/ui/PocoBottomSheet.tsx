import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const SHEET_MS = 380
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

function useReduceMotion() {
  return typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true'
}

/**
 * Native-style bottom sheet: GPU transform, sits under the mobile tab bar (z-order),
 * backdrop stops above the bar so tabs stay readable.
 */
export function PocoBottomSheet({
  open,
  onExitComplete,
  onBackdropClick,
  children,
  dragDismiss = true,
  sheetClassName = '',
  dragHandle = true,
}: {
  open: boolean
  onExitComplete?: () => void
  onBackdropClick?: () => void
  children: ReactNode
  dragDismiss?: boolean
  sheetClassName?: string
  dragHandle?: boolean
}) {
  const reduceMotion = useReduceMotion()
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPx, setDragPx] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef(0)
  const dragPxRef = useRef(0)

  useEffect(() => {
    if (open) {
      // Sync mount with open prop for enter animation (not derivable from render alone).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional staged mount
      setMounted(true)
      setDragPx(0)
      dragPxRef.current = 0
      setIsDragging(false)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
  }, [open])

  const duration = reduceMotion ? 1 : SHEET_MS

  /** Same class of bug as center modals: opacity-0 backdrops must not keep capturing taps (e.g. iOS / reduced motion skipping transitionend). */
  useEffect(() => {
    if (!open && mounted) {
      const t = window.setTimeout(() => setMounted(false), duration + 200)
      return () => window.clearTimeout(t)
    }
  }, [open, mounted, duration])

  const onSheetTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== 'transform') return
      if (e.target !== sheetRef.current) return
      if (!open && !entered) {
        onExitComplete?.()
        setMounted(false)
      }
    },
    [open, entered, onExitComplete],
  )

  const dismissFromDrag = useCallback(() => {
    setIsDragging(false)
    setDragPx(0)
    dragPxRef.current = 0
    onBackdropClick?.()
  }, [onBackdropClick])

  if (!mounted) return null

  const showOpen = entered && open

  let transform: string
  if (!showOpen) {
    transform = 'translate3d(0, 100%, 0)'
  } else if (isDragging && dragPx > 0) {
    transform = `translate3d(0, ${dragPx}px, 0)`
  } else {
    transform = 'translate3d(0, 0, 0)'
  }

  const transition = isDragging ? 'none' : `transform ${duration}ms ${EASE}`

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close sheet"
        className={`fixed left-0 right-0 top-0 z-[var(--poco-z-sheet-backdrop)] max-md:bottom-[var(--poco-mobile-nav-height)] md:bottom-0 md:inset-0 md:z-[var(--poco-z-sheet-backdrop-md)] bg-black/35 backdrop-blur-[1px] transition-opacity ${showOpen ? 'opacity-100' : 'opacity-0'}`}
        style={{
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: EASE,
          pointerEvents: showOpen ? 'auto' : 'none',
        }}
        onClick={() => onBackdropClick?.()}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className={`fixed inset-x-0 z-[var(--poco-z-sheet-panel)] mx-auto flex max-h-[min(76dvh,calc(100dvh-var(--poco-mobile-nav-height)-max(0.75rem,env(safe-area-inset-top))))] max-w-lg flex-col border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] max-md:bottom-[var(--poco-mobile-nav-height)] md:bottom-4 md:z-[var(--poco-z-sheet-panel-md)] md:max-h-[90dvh] md:shadow-xl ${sheetClassName} ${showOpen ? '' : 'pointer-events-none'}`}
        style={{
          transform,
          transition,
          willChange: 'transform',
        }}
        onTransitionEnd={onSheetTransitionEnd}
      >
        {dragHandle ? (
          <div
            className="flex shrink-0 touch-none cursor-grab justify-center py-3 active:cursor-grabbing"
            onPointerDown={(e) => {
              if (!dragDismiss || reduceMotion) return
              e.currentTarget.setPointerCapture(e.pointerId)
              setIsDragging(true)
              dragStart.current = e.clientY
              setDragPx(0)
              dragPxRef.current = 0
            }}
            onPointerMove={(e) => {
              if (!dragDismiss || reduceMotion) return
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
              const d = Math.max(0, e.clientY - dragStart.current)
              dragPxRef.current = d
              setDragPx(d)
            }}
            onPointerUp={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
              e.currentTarget.releasePointerCapture(e.pointerId)
              const d = dragPxRef.current
              setIsDragging(false)
              setDragPx(0)
              dragPxRef.current = 0
              if (d > 88) dismissFromDrag()
            }}
            onPointerCancel={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId)
              }
              setIsDragging(false)
              setDragPx(0)
              dragPxRef.current = 0
            }}
          >
            <span className="h-1 w-10 rounded-none bg-[var(--border-default)]" />
          </div>
        ) : null}
        {children}
      </div>
    </>,
    document.body,
  )
}
