// Service Worker — Portaria Digital PWA
// Estratégia: Network First para API, Cache First para assets estáticos

const CACHE_NAME = 'portaria-digital-v1'
const STATIC_CACHE = 'portaria-static-v1'

// Assets para cache offline (shell do app)
const PRECACHE_URLS = [
  '/',
  '/veiculos',
  '/acesso',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Install: pré-cacheia o shell do app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== STATIC_CACHE).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch: Network First para API, Cache First para tudo mais
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Sempre rede para APIs (nunca cache de dados dinâmicos)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ success: false, error: 'Sem conexão com a internet' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // Cache First para assets estáticos (imagens, fontes, JS, CSS)
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // Network First para navegação (páginas HTML)
  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone()
        caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
        return response
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
  )
})
