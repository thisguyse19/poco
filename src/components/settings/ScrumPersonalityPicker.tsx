import { useCallback, useEffect, useRef, useState } from 'react'
import type { ScrumMasterPersonality } from '../../types'
import { SCRUM_MASTER_PERSONALITIES, scrumPersonalityMeta } from '../../utils/scrumMaster'
import { PocoMessageDialog } from '../ui/PocoMessageDialog'
import { triggerHaptic } from '../../utils/haptics'

const HIDE_STEPS_MS = 5000
const GLOW_MS = 700

export function ScrumPersonalityPicker({
  value,
  onChange,
  compact,
}: {
  value: ScrumMasterPersonality
  onChange: (p: ScrumMasterPersonality) => void
  /** Slightly wider cards for first-run setup */
  compact?: boolean
}) {
  const [boldSeg, setBoldSeg] = useState(0)
  const [snarkySeg, setSnarkySeg] = useState(0)
  const [boldGlow, setBoldGlow] = useState(false)
  const [snarkyGlow, setSnarkyGlow] = useState(false)
  const boldSegRef = useRef(0)
  const snarkySegRef = useRef(0)
  const boldHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snarkyHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [boldR21Info, setBoldR21Info] = useState(false)
  const [snarkyR21Info, setSnarkyR21Info] = useState(false)

  const clearBoldHide = useCallback(() => {
    if (boldHideRef.current != null) {
      clearTimeout(boldHideRef.current)
      boldHideRef.current = null
    }
  }, [])

  const clearSnarkyHide = useCallback(() => {
    if (snarkyHideRef.current != null) {
      clearTimeout(snarkyHideRef.current)
      snarkyHideRef.current = null
    }
  }, [])

  const scheduleBoldHide = useCallback(() => {
    clearBoldHide()
    boldHideRef.current = window.setTimeout(() => {
      boldSegRef.current = 0
      setBoldSeg(0)
      boldHideRef.current = null
    }, HIDE_STEPS_MS)
  }, [clearBoldHide])

  const scheduleSnarkyHide = useCallback(() => {
    clearSnarkyHide()
    snarkyHideRef.current = window.setTimeout(() => {
      snarkySegRef.current = 0
      setSnarkySeg(0)
      snarkyHideRef.current = null
    }, HIDE_STEPS_MS)
  }, [clearSnarkyHide])

  useEffect(
    () => () => {
      clearBoldHide()
      clearSnarkyHide()
    },
    [clearBoldHide, clearSnarkyHide],
  )

  const bumpBoldSecret = useCallback(() => {
    setBoldGlow(true)
    window.setTimeout(() => setBoldGlow(false), GLOW_MS)
    triggerHaptic(6)
    scheduleBoldHide()
    const n = boldSegRef.current + 1
    if (n >= 4) {
      boldSegRef.current = 0
      setBoldSeg(0)
      clearBoldHide()
      onChange('boldR21')
      setBoldR21Info(true)
      triggerHaptic([18, 36, 18])
    } else {
      boldSegRef.current = n
      setBoldSeg(n)
    }
  }, [clearBoldHide, onChange, scheduleBoldHide])

  const bumpSnarkySecret = useCallback(() => {
    setSnarkyGlow(true)
    window.setTimeout(() => setSnarkyGlow(false), GLOW_MS)
    triggerHaptic(6)
    scheduleSnarkyHide()
    const n = snarkySegRef.current + 1
    if (n >= 4) {
      snarkySegRef.current = 0
      setSnarkySeg(0)
      clearSnarkyHide()
      onChange('snarkyR21')
      setSnarkyR21Info(true)
      triggerHaptic([18, 36, 18])
    } else {
      snarkySegRef.current = n
      setSnarkySeg(n)
    }
  }, [clearSnarkyHide, onChange, scheduleSnarkyHide])

  const minW = compact ? 'min-w-[9.5rem]' : 'min-w-[8.5rem]'
  const pad = compact ? 'px-3 py-3' : 'px-2.5 py-2'
  const titleCls = compact ? 'text-sm' : 'text-xs'

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SCRUM_MASTER_PERSONALITIES.map((p) => {
          const isBold = p.id === 'bold'
          const isSnarky = p.id === 'snarky'
          const selected =
            isBold ? value === 'bold' || value === 'boldR21' : isSnarky ? value === 'snarky' || value === 'snarkyR21' : value === p.id

          const meta =
            isBold && value === 'boldR21'
              ? scrumPersonalityMeta('boldR21')
              : isSnarky && value === 'snarkyR21'
                ? scrumPersonalityMeta('snarkyR21')
                : { title: p.title, hint: p.hint }

          const glowClass = isBold && boldGlow ? 'poco-personality-bold-pulse' : isSnarky && snarkyGlow ? 'poco-personality-snarky-pulse' : ''

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (isBold) {
                  if (value !== 'boldR21') onChange('bold')
                  bumpBoldSecret()
                  return
                }
                if (isSnarky) {
                  if (value !== 'snarkyR21') onChange('snarky')
                  bumpSnarkySecret()
                  return
                }
                onChange(p.id)
              }}
              className={`poco-press relative ${minW} shrink-0 rounded-none border ${pad} text-left transition-[box-shadow,background-color,border-color] duration-200 [transition-timing-function:var(--ease-ios)] ${
                selected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-subtle)] bg-[var(--bg-base)]'
              } ${compact ? 'rounded-[var(--radius-sm)]' : ''} ${glowClass}`}
            >
              <span className={`block font-semibold text-[var(--text-primary)] ${titleCls}`}>{meta.title}</span>
              <span className={`mt-0.5 block leading-snug text-[var(--text-secondary)] ${compact ? 'text-xs' : 'text-[10px]'}`}>{meta.hint}</span>
              {isBold && boldSeg > 0 ? (
                <span className="mt-1.5 flex gap-1" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-none ${i < boldSeg ? 'bg-[#c41e1e]' : 'bg-[var(--border-default)]'} opacity-90 transition-colors duration-200`}
                    />
                  ))}
                </span>
              ) : null}
              {isSnarky && snarkySeg > 0 ? (
                <span className="mt-1.5 flex gap-1" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-none ${i < snarkySeg ? 'bg-[#2563eb]' : 'bg-[var(--border-default)]'} opacity-90 transition-colors duration-200`}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <PocoMessageDialog
        open={boldR21Info}
        title="Bold R21 unlocked"
        message="Bold R21 is an adults-only voice: spicy, blunt, and stripped of corporate polish. It is still meant to be fun, not cruel—consent and basic decency still matter. You can switch back to standard Bold or any other tone in this list whenever you want."
        onClose={() => setBoldR21Info(false)}
      />
      <PocoMessageDialog
        open={snarkyR21Info}
        title="Snarky R21 unlocked"
        message="Snarky R21 dials sarcasm way up and swears freely—rude, vulgar in a non-sexual way, and allergic to HR-safe platitudes. Great if you want your Scrum copy to sound like a tired engineer on their fourth coffee—not great if you need something safe for a work demo. Pick another tone anytime."
        onClose={() => setSnarkyR21Info(false)}
      />
    </>
  )
}
