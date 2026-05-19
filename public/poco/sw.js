/* poco — minimal offline shell */
const SCOPE = self.registration.scope
const CORE = [SCOPE, SCOPE + 'index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('poco-shell-v2').then((cache) => cache.addAll(CORE).catch(() => undefined)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/** iOS / PWA: some builds show local notifications more reliably from the SW context. */
self.addEventListener('message', (event) => {
  const d = event.data
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
