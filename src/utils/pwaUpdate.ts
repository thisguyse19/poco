const BASE_PATH = import.meta.env.BASE_URL

/** Same-origin URLs for the poco shell worker (avoids path-resolution quirks on mobile / hash routes). */
function pocoServiceWorkerUrls(): { scopeUrl: string; scriptUrl: string } {
  const scopeUrl = new URL(BASE_PATH, window.location.origin).href
  // Worker must live at public/sw.js → dist/sw.js → {origin}{BASE}sw.js so the script URL’s
  // directory equals the scope path. A worker under public/poco/sw.js would be .../poco/poco/sw.js
  // and could not legally use scope .../poco/ (Service Worker max-scope rule).
  const scriptUrl = new URL('sw.js', scopeUrl).href
  return { scopeUrl, scriptUrl }
}

function normalizeScopeUrl(u: string): string {
  return u.replace(/\/$/, '') || u
}

/** Remove registrations that used a worker under {base}poco/sw.js (invalid scope vs script for scope {base}). */
async function unregisterLegacyNestedPocoWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return
  const base = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH
  const legacyPath = `${base}/poco/sw.js`
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      regs
        .filter((r) => {
          const u =
            r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? ''
          return u.includes(legacyPath)
        })
        .map((r) => r.unregister().catch(() => undefined)),
    )
  } catch {
    /* ignore */
  }
}

/** Used when `register()` rejects but the page may already have an active registration (e.g. flaky network). */
async function getExistingPocoRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  const sw = navigator.serviceWorker
  const want = normalizeScopeUrl(pocoServiceWorkerUrls().scopeUrl)
  try {
    const byClient = await sw.getRegistration()
    if (byClient && normalizeScopeUrl(byClient.scope) === want) return byClient
  } catch {
    /* ignore */
  }
  try {
    const all = await sw.getRegistrations()
    return all.find((r) => normalizeScopeUrl(r.scope) === want)
  } catch {
    return undefined
  }
}

export type PocoServiceWorkerOutcome =
  | { ok: true; registration: ServiceWorkerRegistration }
  | { ok: false; message: string }

/**
 * Ensure the poco service worker is registered (idempotent).
 * Uses `import.meta.env.BASE_URL` for scope; worker script is `sw.js` next to the app base.
 * If `register()` throws (transient network, etc.) but a registration already exists, returns that registration.
 */
export async function ensurePocoServiceWorkerWithOutcome(): Promise<PocoServiceWorkerOutcome> {
  if (typeof navigator === 'undefined') {
    return { ok: false, message: 'Service workers are not available in this environment.' }
  }
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker) {
    return { ok: false, message: 'This browser does not support service workers.' }
  }
  if (!window.isSecureContext) {
    return {
      ok: false,
      message: 'Service workers require a secure context (HTTPS). Open poco over https:// and try again.',
    }
  }

  const sw = navigator.serviceWorker
  const { scopeUrl, scriptUrl } = pocoServiceWorkerUrls()

  await unregisterLegacyNestedPocoWorkers()

  try {
    const registration = await sw.register(scriptUrl, { scope: scopeUrl, updateViaCache: 'none' })
    return { ok: true, registration }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    const existing = await getExistingPocoRegistration()
    if (existing) {
      return { ok: true, registration: existing }
    }
    return {
      ok: false,
      message: `Could not register the service worker (${detail}). Check that ${scriptUrl} is deployed (public/sw.js → dist/sw.js) and matches scope ${scopeUrl}.`,
    }
  }
}

/** Returns the registration when possible; use `ensurePocoServiceWorkerWithOutcome` if you need an error message. */
export async function ensurePocoServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  const o = await ensurePocoServiceWorkerWithOutcome()
  return o.ok ? o.registration : null
}

/**
 * Ask the browser to fetch a new service worker script (standard PWA update check).
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
