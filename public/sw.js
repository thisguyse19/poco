/* poco service worker: offline shell + user-confirmed updates.
 * Served at {origin}{base}/sw.js with scope {base}/ so scope matches Vite base (e.g. /poco/).
 * Network-first for app URLs so new deploys are not stuck behind a stale precache. */
const SCOPE = self.registration.scope
const CORE = [SCOPE, SCOPE + 'index.html']
const CACHE = 'poco-shell-v7'

function scopePath() {
  try {
    return new URL(SCOPE).pathname
  } catch {
    return '/poco/'
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE).catch(() => undefined)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('poco-shell-') && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  const d = event.data
  if (d && d.type === 'SKIP_WAITING') {
    void self.skipWaiting()
    return
  }
  if (!d || d.type !== 'poco-show-notification') return
  const icon = d.icon || undefined
  const opts = {
    body: d.body,
    tag: d.tag,
    silent: Boolean(d.silent),
    icon,
    badge: icon,
  }
  event.waitUntil(self.registration.showNotification(d.title, opts).catch(() => undefined))
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  if (url.origin !== new URL(SCOPE).origin) return

  const pathPrefix = scopePath().replace(/\/$/, '') || '/poco'
  if (!(url.pathname === pathPrefix || url.pathname.startsWith(`${pathPrefix}/`))) return

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const isShell =
            url.pathname === pathPrefix ||
            url.pathname === `${pathPrefix}/` ||
            url.pathname === `${pathPrefix}/index.html` ||
            (url.pathname.startsWith(`${pathPrefix}/`) && url.pathname.endsWith('/index.html'))
          if (isShell) {
            const copy = networkResponse.clone()
            void caches.open(CACHE).then((cache) => cache.put(request, copy).catch(() => undefined))
          }
        }
        return networkResponse
      })
      .catch(() =>
        caches
          .match(request)
          .then((cached) => cached || caches.match(SCOPE + 'index.html') || caches.match(SCOPE)),
      ),
  )
})
