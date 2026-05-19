import { useCallback, useEffect, useRef, useState } from 'react'
import { activateWaitingServiceWorkerAndReload, ensurePocoServiceWorker, probeServiceWorkerUpdate } from '../../utils/pwaUpdate'

/**
 * On load (especially installed PWA), checks for a new service worker and shows a slim bar to reload.
 * Non-modal: user can ignore until later; next navigation or manual check can surface it again.
 */
export function PwaUpdateToast() {
  const [waiting, setWaiting] = useState(false)
  const regRef = useRef<ServiceWorkerRegistration | null>(null)

  const wireRegistration = useCallback((reg: ServiceWorkerRegistration) => {
    regRef.current = reg
    const onUpdateFound = () => {
      const nw = reg.installing ?? reg.waiting
      if (!nw) return
      if (nw.state === 'installed' && navigator.serviceWorker.controller) {
        setWaiting(true)
        return
      }
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          setWaiting(true)
        }
      })
    }
    reg.addEventListener('updatefound', onUpdateFound)
    return () => reg.removeEventListener('updatefound', onUpdateFound)
  }, [])

  useEffect(() => {
    const onPending = () => setWaiting(true)
    window.addEventListener('poco-pwa-update-pending', onPending)
    return () => window.removeEventListener('poco-pwa-update-pending', onPending)
  }, [])

  useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false
    void (async () => {
      const reg = await ensurePocoServiceWorker()
      if (cancelled || !reg) return
      unsub = wireRegistration(reg)
      const hasWaiting = await probeServiceWorkerUpdate(reg)
      if (!cancelled && hasWaiting) setWaiting(true)
    })()
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [wireRegistration])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      const reg = regRef.current
      if (!reg) return
      void probeServiceWorkerUpdate(reg).then((w) => {
        if (w) setWaiting(true)
      })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  /** Hourly update check while the tab stays open (e.g. long-lived PWA). */
  useEffect(() => {
    const id = window.setInterval(() => {
      const reg = regRef.current
      if (!reg) return
      void probeServiceWorkerUpdate(reg).then((w) => {
        if (w) setWaiting(true)
      })
    }, 60 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  const onUpdate = useCallback(() => {
    const reg = regRef.current
    if (!reg) return
    activateWaitingServiceWorkerAndReload(reg)
  }, [])

  const onDismiss = useCallback(() => setWaiting(false), [])

  if (!waiting) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--poco-mobile-nav-height)+0.5rem)] z-[200] flex justify-center px-3 md:bottom-4 md:px-6"
    >
      <div className="pointer-events-auto flex max-w-lg flex-wrap items-center gap-2 rounded-none border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-md">
        <span className="text-[var(--text-secondary)]">A new version of poco is ready.</span>
        <button type="button" className="poco-press font-semibold text-[var(--accent)]" onClick={onUpdate}>
          Update
        </button>
        <button type="button" className="poco-press text-[var(--text-tertiary)]" onClick={onDismiss}>
          Later
        </button>
      </div>
    </div>
  )
}
