/* poco — minimal offline shell */
const SCOPE = self.registration.scope
const CORE = [SCOPE, SCOPE + 'index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('poco-shell-v1').then((cache) => cache.addAll(CORE).catch(() => undefined)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
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
