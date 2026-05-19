import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { OOBE_TOUR_STEPS, useOobeTourStore } from '../../stores/oobeTourStore'

const HIGHLIGHT = 'poco-oobe-anchor-active'
const GAP = 12
const VIEW_PAD = 12

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function OobeGuidedTour() {
  const active = useOobeTourStore((s) => s.active)
  const stepIndex = useOobeTourStore((s) => s.stepIndex)
  const nextStep = useOobeTourStore((s) => s.nextStep)
  const skipTour = useOobeTourStore((s) => s.skipTour)
  const navigate = useNavigate()
  const location = useLocation()
  const highlightedEl = useRef<HTMLElement | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardPos, setCardPos] = useState<{ left: number; top: number }>({ left: VIEW_PAD, top: VIEW_PAD })

  const step = OOBE_TOUR_STEPS[stepIndex] ?? OOBE_TOUR_STEPS[0]!

  useEffect(() => {
    if (!active) return
    if (location.pathname !== step.path) {
      navigate(step.path)
    }
  }, [active, step.path, location.pathname, navigate])

  const measureAndPlace = useCallback(() => {
    if (!active) return
    const card = cardRef.current
    const vw = window.innerWidth
    const vh = window.innerHeight
    const insetRaw = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')
    const safeBottom = Math.max(12, parseFloat(insetRaw) || 0)
    const bottomReserve = Math.max(safeBottom, 72)

    const cw = Math.min((card?.offsetWidth ?? 360) || 360, vw - 2 * VIEW_PAD)
    const ch = (card?.offsetHeight ?? 1) || 1

    const anchor = OOBE_TOUR_STEPS[stepIndex]?.anchor
    let anchorRect: DOMRect | null = null
    if (anchor) {
      const el = document.querySelector(`[data-oobe="${CSS.escape(anchor)}"]`)
      if (el instanceof HTMLElement) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) anchorRect = r
      }
    }

    if (anchorRect) {
      let top = anchorRect.bottom + GAP
      if (top + ch > vh - bottomReserve - VIEW_PAD) {
        top = anchorRect.top - GAP - ch
      }
      if (top < VIEW_PAD) {
        top = clamp(anchorRect.bottom + GAP, VIEW_PAD, Math.max(VIEW_PAD, vh - ch - bottomReserve - VIEW_PAD))
      }
      const left = clamp(anchorRect.left + anchorRect.width / 2 - cw / 2, VIEW_PAD, vw - cw - VIEW_PAD)
      setCardPos({ left, top })
    } else {
      setCardPos({
        left: clamp((vw - cw) / 2, VIEW_PAD, vw - cw - VIEW_PAD),
        top: Math.max(VIEW_PAD, vh - ch - bottomReserve - VIEW_PAD),
      })
    }
  }, [active, stepIndex])

  useLayoutEffect(() => {
    highlightedEl.current?.classList.remove(HIGHLIGHT)
    highlightedEl.current = null
    if (!active) return
    const anchor = OOBE_TOUR_STEPS[stepIndex]?.anchor
    if (!anchor) {
      measureAndPlace()
      return
    }
    const id = window.requestAnimationFrame(() => {
      const el = document.querySelector(`[data-oobe="${CSS.escape(anchor)}"]`)
      if (!(el instanceof HTMLElement)) {
        measureAndPlace()
        return
      }
      highlightedEl.current = el
      el.classList.add(HIGHLIGHT)
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      window.requestAnimationFrame(measureAndPlace)
    })
    return () => {
      window.cancelAnimationFrame(id)
      highlightedEl.current?.classList.remove(HIGHLIGHT)
      highlightedEl.current = null
    }
  }, [active, stepIndex, measureAndPlace])

  useLayoutEffect(() => {
    measureAndPlace()
  }, [step.title, step.body, measureAndPlace])

  useEffect(() => {
    if (!active) return
    const ro = new ResizeObserver(() => measureAndPlace())
    const card = cardRef.current
    if (card) ro.observe(card)
    const anchor = step.anchor
    let anchorEl: Element | null = null
    if (anchor) {
      anchorEl = document.querySelector(`[data-oobe="${CSS.escape(anchor)}"]`)
      if (anchorEl) ro.observe(anchorEl)
    }
    window.addEventListener('resize', measureAndPlace)
    document.addEventListener('scroll', measureAndPlace, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measureAndPlace)
      document.removeEventListener('scroll', measureAndPlace, true)
    }
  }, [active, step.anchor, measureAndPlace])

  if (!active || typeof document === 'undefined') return null

  const isLast = stepIndex >= OOBE_TOUR_STEPS.length - 1

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[280]">
      <div
        ref={cardRef}
        role="region"
        aria-labelledby="oobe-tour-title"
        aria-live="polite"
        className="pointer-events-auto absolute w-[min(100%-1.5rem,28rem)] max-w-[min(100%-1.5rem,28rem)] overflow-y-auto rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 shadow-lg [max-height:min(50dvh,22rem)]"
        style={{ left: cardPos.left, top: cardPos.top }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          Guided tour · {stepIndex + 1} / {OOBE_TOUR_STEPS.length}
        </p>
        <h2 id="oobe-tour-title" className="mt-1 font-serif text-xl text-[var(--text-primary)]">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{step.body}</p>
        {step.tryThis ? (
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">You can still tap Next to skip this hands-on step.</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="poco-press rounded-none bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--text-inverse)]"
            onClick={() => nextStep()}
          >
            {isLast ? 'Done' : 'Next'}
          </button>
          <button type="button" className="poco-press text-sm font-semibold text-[var(--text-secondary)]" onClick={() => skipTour()}>
            Skip tour
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
