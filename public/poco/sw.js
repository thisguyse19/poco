/* poco — offline shell; user-confirmed updates */
const SCOPE = self.registration.scope
const CORE = [SCOPE, SCOPE + 'index.html']
const CACHE = 'poco-shell-v4'

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
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).catch(() => caches.match(SCOPE))
    }),
  )
})
