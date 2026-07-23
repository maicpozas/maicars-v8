const CACHE_NAME = 'maicars-pwa-v9';
const ASSETS = [ '/', '/index.html', '/manifest.webmanifest', '/assets/icon-192.png', '/assets/icon-512.png' ];
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))))); self.clients.claim(); });
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Las llamadas a la API (datos de la nube) nunca se sirven desde caché: siempre red.
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (url.origin === self.location.origin) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => { if (req.destination === 'document') return caches.match('/index.html'); });
      return cached || fetchPromise;
    })
  );
});
