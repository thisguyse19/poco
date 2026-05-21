import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { pocoDevLab } from '../utils/pocoDevLab'
import { triggerHaptic } from '../utils/haptics'

const HIDE_STEPS_MS = 5000
const GLOW_MS = 700
const TAPS_TO_UNLOCK = 4

/** Multi-tap “Male” voice cell to unlock Slayer R21 (same cadence as Bold / Snarky R21). */
export function useSlayMaleVoiceSecret() {
  const [seg, setSeg] = useState(0)
  const [glow, setGlow] = useState(false)
  const segRef = useRef(0)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unlocked = useSyncExternalStore(
    (cb) => pocoDevLab.subscribe(() => cb()),
    () => pocoDevLab.get().scrumSlayVoiceUnlocked,
    () => false,
  )

  const clearHide = useCallback(() => {
    if (hideRef.current != null) {
      clearTimeout(hideRef.current)
      hideRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearHide()
    hideRef.current = window.setTimeout(() => {
      segRef.current = 0
      setSeg(0)
      hideRef.current = null
    }, HIDE_STEPS_MS)
  }, [clearHide])

  useEffect(
    () => () => {
      clearHide()
    },
    [clearHide],
  )

  const resetProgress = useCallback(() => {
    segRef.current = 0
    setSeg(0)
    clearHide()
  }, [clearHide])

  const onMaleTap = useCallback(() => {
    if (unlocked) return
    setGlow(true)
    window.setTimeout(() => setGlow(false), GLOW_MS)
    triggerHaptic(6)
    scheduleHide()
    const n = segRef.current + 1
    if (n >= TAPS_TO_UNLOCK) {
      segRef.current = 0
      setSeg(0)
      clearHide()
      pocoDevLab.set({ scrumSlayVoiceUnlocked: true })
      triggerHaptic([18, 36, 18])
    } else {
      segRef.current = n
      setSeg(n)
    }
  }, [clearHide, scheduleHide, unlocked])

  return { unlocked, seg, glow, onMaleTap, resetProgress }
}
