import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { OOBE_TOUR_STEPS, useOobeTourStore } from '../../stores/oobeTourStore'

const HIGHLIGHT = 'poco-oobe-anchor-active'

export function OobeGuidedTour() {
  const active = useOobeTourStore((s) => s.active)
  const stepIndex = useOobeTourStore((s) => s.stepIndex)
  const nextStep = useOobeTourStore((s) => s.nextStep)
  const skipTour = useOobeTourStore((s) => s.skipTour)
  const navigate = useNavigate()
  const location = useLocation()
  const highlightedEl = useRef<HTMLElement | null>(null)

  const step = OOBE_TOUR_STEPS[stepIndex] ?? OOBE_TOUR_STEPS[0]!

  useEffect(() => {
    if (!active) return
    if (location.pathname !== step.path) {
      navigate(step.path)
    }
  }, [active, step.path, location.pathname, navigate])

  useLayoutEffect(() => {
    highlightedEl.current?.classList.remove(HIGHLIGHT)
    highlightedEl.current = null
    if (!active) return
    const anchor = OOBE_TOUR_STEPS[stepIndex]?.anchor
    if (!anchor) return
    const id = window.requestAnimationFrame(() => {
      const el = document.querySelector(`[data-oobe="${CSS.escape(anchor)}"]`)
      if (!(el instanceof HTMLElement)) return
      highlightedEl.current = el
      el.classList.add(HIGHLIGHT)
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => {
      window.cancelAnimationFrame(id)
      highlightedEl.current?.classList.remove(HIGHLIGHT)
      highlightedEl.current = null
    }
  }, [active, stepIndex])

  if (!active || typeof document === 'undefined') return null

  const isLast = stepIndex >= OOBE_TOUR_STEPS.length - 1

  return createPortal(
    <div
      className="fixed inset-0 z-[280] flex flex-col justify-end bg-black/45 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 md:items-center md:justify-center md:px-6 md:pb-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oobe-tour-title"
    >
      <div className="max-h-[50dvh] w-full max-w-md overflow-y-auto rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 shadow-lg md:max-h-[min(72vh,28rem)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          Guided tour · {stepIndex + 1} / {OOBE_TOUR_STEPS.length}
        </p>
        <h2 id="oobe-tour-title" className="mt-1 font-serif text-xl text-[var(--text-primary)]">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{step.body}</p>
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
