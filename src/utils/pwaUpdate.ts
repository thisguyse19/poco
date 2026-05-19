const SW_PATH = '/poco/sw.js'
const SW_SCOPE = '/poco/'

/** Ensure the poco service worker is registered (idempotent). */
export async function ensurePocoServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE, updateViaCache: 'none' })
  } catch {
    return null
  }
}

/**
 * Ask the browser to fetch a new service worker script.
 * Returns true if a newer worker is ready to take over (`waiting`) or just finished install while a page is controlled.
 * Note: `reg.update()` can resolve before `installing` reaches `installed`, so we wait on that transition.
 */
export async function probeServiceWorkerUpdate(reg: ServiceWorkerRegistration | null): Promise<boolean> {
  if (!reg) return false
  try {
    await reg.update()
  } catch {
    return false
  }
  if (reg.waiting) return true

  const installing = reg.installing
  if (!installing || !navigator.serviceWorker.controller) return false

  const whenInstalled = () =>
    new Promise<boolean>((resolve) => {
      const finish = () => resolve(Boolean(reg.waiting))
      if (installing.state === 'installed') {
        queueMicrotask(finish)
        return
      }
      const onState = () => {
        if (installing.state === 'installed') {
          installing.removeEventListener('statechange', onState)
          finish()
        }
        if (installing.state === 'redundant') {
          installing.removeEventListener('statechange', onState)
          resolve(false)
        }
      }
      installing.addEventListener('statechange', onState)
      window.setTimeout(() => {
        installing.removeEventListener('statechange', onState)
        finish()
      }, 15_000)
    })

  return whenInstalled()
}

/** Activate the waiting worker and reload once it controls the page. */
export function activateWaitingServiceWorkerAndReload(reg: ServiceWorkerRegistration): void {
  const w = reg.waiting
  if (!w) {
    window.location.reload()
    return
  }
  const reload = () => {
    window.location.reload()
  }
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })
  w.postMessage({ type: 'SKIP_WAITING' })
}
