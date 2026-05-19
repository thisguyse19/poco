import { useEffect, useRef, useState } from 'react'
import type { ScrumBannerView } from '../../utils/scrumMaster'
import { buildFarewellBannerLine, buildScrumBannerLine, scrumVoiceLeadIn } from '../../utils/scrumMaster'
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

  const isFarewell = display.kind === 'farewellUp' || display.kind === 'farewellDown'
  let line: string
  if (display.kind === 'farewellUp' || display.kind === 'farewellDown') {
    line = buildFarewellBannerLine(display.kind, personality)
  } else {
    const sched = display as { visible: true; kind: 'standUp' | 'standDown'; deltaMinutes: number }
    line = buildScrumBannerLine(sched.kind, sched.deltaMinutes, personality)
  }

  const shellClass = `poco-scrum-banner mb-3 w-full rounded-[var(--radius-sm)] border border-transparent bg-[var(--bg-base)] px-3 py-3 text-left shadow-sm transition-all duration-[420ms] [transition-timing-function:var(--ease-ios)] ${
    exiting ? 'pointer-events-none translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
  }`

  const inner = (
    <>
      <p className="font-serif text-base font-semibold leading-snug text-[var(--text-primary)]">
        <span className="poco-scrum-text-gradient">{name}</span> {scrumVoiceLeadIn(personality)}
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{line}</p>
    </>
  )

  if (isFarewell) {
    return (
      <div role="status" className={shellClass}>
        {inner}
      </div>
    )
  }

  return (
    <button type="button" onClick={onTapStart} className={shellClass}>
      {inner}
    </button>
  )
}
