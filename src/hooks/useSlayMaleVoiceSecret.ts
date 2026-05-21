import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { pocoDevLab } from '../utils/pocoDevLab'
import { triggerHaptic } from '../utils/haptics'

/** All four Male taps must fall within this window from the first tap. */
const UNLOCK_WINDOW_MS = 5000
const GLOW_MS = 700
const TAPS_TO_UNLOCK = 4

/** Multi-tap “Male” voice cell to unlock Slayer R21 (four taps within five seconds). */
export function useSlayMaleVoiceSecret() {
  const [seg, setSeg] = useState(0)
  const [glow, setGlow] = useState(false)
  const segRef = useRef(0)
  const firstTapAtRef = useRef(0)
  const windowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const eggDisabled = useSyncExternalStore(
    (cb) => pocoDevLab.subscribe(() => cb()),
    () => pocoDevLab.get().scrumSlayEggDisabled,
    () => false,
  )

  const voiceUnlocked = useSyncExternalStore(
    (cb) => pocoDevLab.subscribe(() => cb()),
    () => pocoDevLab.get().scrumSlayVoiceUnlocked,
    () => false,
  )

  const slayReveal = voiceUnlocked && !eggDisabled

  const clearWindowTimer = useCallback(() => {
    if (windowTimerRef.current != null) {
      clearTimeout(windowTimerRef.current)
      windowTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!eggDisabled) return
    segRef.current = 0
    firstTapAtRef.current = 0
    clearWindowTimer()
    queueMicrotask(() => {
      setSeg(0)
    })
  }, [eggDisabled, clearWindowTimer])

  useEffect(
    () => () => {
      clearWindowTimer()
    },
    [clearWindowTimer],
  )

  const resetProgress = useCallback(() => {
    segRef.current = 0
    setSeg(0)
    firstTapAtRef.current = 0
    clearWindowTimer()
  }, [clearWindowTimer])

  const scheduleWindowExpiry = useCallback(
    (fromMs: number) => {
      clearWindowTimer()
      windowTimerRef.current = window.setTimeout(() => {
        if (pocoDevLab.get().scrumSlayVoiceUnlocked) return
        segRef.current = 0
        setSeg(0)
        firstTapAtRef.current = 0
        windowTimerRef.current = null
      }, Math.max(40, UNLOCK_WINDOW_MS - (Date.now() - fromMs)))
    },
    [clearWindowTimer],
  )

  const onMaleTap = useCallback(() => {
    if (slayReveal || eggDisabled) return
    setGlow(true)
    window.setTimeout(() => setGlow(false), GLOW_MS)
    triggerHaptic(6)

    const now = Date.now()
    const expired = segRef.current > 0 && now - firstTapAtRef.current > UNLOCK_WINDOW_MS

    if (segRef.current === 0 || expired) {
      firstTapAtRef.current = now
      segRef.current = 1
      setSeg(1)
      scheduleWindowExpiry(now)
      return
    }

    const n = segRef.current + 1
    if (n >= TAPS_TO_UNLOCK) {
      clearWindowTimer()
      segRef.current = 0
      setSeg(0)
      firstTapAtRef.current = 0
      pocoDevLab.set({ scrumSlayVoiceUnlocked: true })
      triggerHaptic([18, 36, 18])
    } else {
      segRef.current = n
      setSeg(n)
    }
  }, [clearWindowTimer, eggDisabled, scheduleWindowExpiry, slayReveal])

  return { slayReveal, eggDisabled, voiceUnlocked, seg, glow, onMaleTap, resetProgress }
}
