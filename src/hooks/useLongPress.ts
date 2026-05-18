import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

export type LongPressHandlers = {
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
  onPointerCancel: (e: PointerEvent) => void
  onClick: (e: MouseEvent) => void
  onContextMenu: (e: MouseEvent) => void
}

/**
 * Hold-to-fire for touch (mobile nav unlock, subtitle unlock). Cancels on move past slop.
 * After a long press, the next click is swallowed so the host (e.g. NavLink) does not navigate.
 */
export function useLongPress(
  onLongPress: () => void,
  options?: { ms?: number; slopPx?: number; disabled?: boolean },
): LongPressHandlers {
  const { ms = 820, slopPx = 16, disabled = false } = options ?? {}
  const cb = useRef(onLongPress)
  useEffect(() => {
    cb.current = onLongPress
  }, [onLongPress])

  const timer = useRef<number | undefined>(undefined)
  const start = useRef({ x: 0, y: 0 })
  const longFired = useRef(false)

  const clearTimer = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current)
      timer.current = undefined
    }
  }, [])

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (disabled) return
      if (e.button !== 0) return
      longFired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      clearTimer()
      timer.current = window.setTimeout(() => {
        longFired.current = true
        timer.current = undefined
        cb.current()
      }, ms)
    },
    [clearTimer, disabled, ms],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (disabled || timer.current == null) return
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      if (dx * dx + dy * dy > slopPx * slopPx) clearTimer()
    },
    [clearTimer, disabled, slopPx],
  )

  const endPointer = useCallback(() => {
    clearTimer()
  }, [clearTimer])

  const onPointerUp = useCallback((_e: PointerEvent) => {
    endPointer()
  }, [endPointer])

  const onPointerCancel = useCallback((_e: PointerEvent) => {
    longFired.current = false
    endPointer()
  }, [endPointer])

  const onClick = useCallback((e: MouseEvent) => {
    if (longFired.current) {
      e.preventDefault()
      e.stopPropagation()
      longFired.current = false
    }
  }, [])

  const onContextMenu = useCallback((e: MouseEvent) => {
    if (!disabled && timer.current != null) e.preventDefault()
  }, [disabled])

  useEffect(() => () => clearTimer(), [clearTimer])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClick,
    onContextMenu,
  }
}
