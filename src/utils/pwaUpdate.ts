const SW_PATH = '/poco/sw.js'
const SW_SCOPE = '/poco/'

/** Ensure the poco service worker is registered (idempotent). */
export async function ensurePocoServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE })
  } catch {
    return null
  }
}

/** Ask the browser to fetch a new service worker script; returns true if a worker is waiting to activate. */
export async function probeServiceWorkerUpdate(reg: ServiceWorkerRegistration | null): Promise<boolean> {
  if (!reg) return false
  try {
    await reg.update()
  } catch {
    return false
  }
  return Boolean(reg.waiting)
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
