import { useEffect, useRef, useState } from 'react'
import type { ScrumBannerView } from '../../utils/scrumMaster'
import { buildScrumBannerLine } from '../../utils/scrumMaster'
import type { ScrumMasterPersonality } from '../../types'

type VisibleBanner = Extract<ScrumBannerView, { visible: true }>

type Props = {
  name: string
  banner: ScrumBannerView
  personality: ScrumMasterPersonality
  onTapStart: () => void
}

export function ScrumMasterBanner({ name, banner, personality, onTapStart }: Props) {
  const [exitSnap, setExitSnap] = useState<VisibleBanner | null>(null)
  const [exiting, setExiting] = useState(false)
  const prevVisible = useRef(false)

  useEffect(() => {
    let cancelled = false
    const v = banner.visible
    if (v) {
      prevVisible.current = true
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return
          setExitSnap(banner)
          setExiting(false)
        })
      })
      return () => {
        cancelled = true
        cancelAnimationFrame(id)
      }
    }
    if (prevVisible.current) {
      prevVisible.current = false
      const id = requestAnimationFrame(() => {
        if (cancelled) return
        setExiting(true)
      })
      const t = window.setTimeout(() => {
        if (cancelled) return
        setExitSnap(null)
        setExiting(false)
      }, 440)
      return () => {
        cancelled = true
        cancelAnimationFrame(id)
        window.clearTimeout(t)
      }
    }
    return undefined
  }, [banner])

  const display: VisibleBanner | null = banner.visible ? banner : exitSnap
  if (!display) return null

  const line = buildScrumBannerLine(display.kind, display.deltaMinutes, personality)

  return (
    <button
      type="button"
      onClick={onTapStart}
      className={`poco-scrum-banner mb-3 w-full rounded-[var(--radius-sm)] border border-transparent bg-[var(--bg-base)] px-3 py-3 text-left shadow-sm transition-all duration-[420ms] [transition-timing-function:var(--ease-ios)] ${
        exiting ? 'pointer-events-none translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <p className="font-serif text-base font-semibold leading-snug text-[var(--text-primary)]">
        <span className="poco-scrum-text-gradient">{name}</span> says…
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{line}</p>
    </button>
  )
}
