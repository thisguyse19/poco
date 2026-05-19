import { useSyncExternalStore } from 'react'

/** True when primary input is fine (mouse / trackpad); false for touch-first. */
export function usePointerFine(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(pointer: fine)')
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(pointer: fine)').matches,
    () => true,
  )
}
