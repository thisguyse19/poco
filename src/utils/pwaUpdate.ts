const BASE_PATH = import.meta.env.BASE_URL

/** Same-origin URLs for the poco shell worker (avoids path-resolution quirks on mobile / hash routes). */
function pocoServiceWorkerUrls(): { scopeUrl: string; scriptUrl: string } {
  const scopeUrl = new URL(BASE_PATH, window.location.origin).href
  // Worker file lives at public/poco/sw.js → dist/poco/sw.js, i.e. {BASE}poco/sw.js (not {BASE}sw.js).
  const scriptUrl = new URL('poco/sw.js', scopeUrl).href
  return { scopeUrl, scriptUrl }
}

function normalizeScopeUrl(u: string): string {
  return u.replace(/\/$/, '') || u
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
 * Uses `import.meta.env.BASE_URL` so the script path matches the Vite base.
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
      message: `Could not register the service worker (${detail}). Check your connection, or that ${scriptUrl} is reachable.`,
    }
  }
}

/** Returns the registration when possible; use `ensurePocoServiceWorkerWithOutcome` if you need an error message. */
export async function ensurePocoServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  const o = await ensurePocoServiceWorkerWithOutcome()
  return o.ok ? o.registration : null
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
