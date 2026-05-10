// OstrichLogin Service Worker v2.10.0
// Strategy: cache-first for assets, network-first for HTML
// Does NOT force-reload on update (prevents session loss)

const CACHE_NAME = 'ostrichlogin-v2.10.0';
const ASSETS = [
  '/OstrichLogin/',
  '/OstrichLogin/index.html',
  '/OstrichLogin/manifest.json',
  '/OstrichLogin/icon-192.png',
  '/OstrichLogin/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // Do NOT call skipWaiting() — prevents force-reloading active sessions
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  // Do NOT call clients.claim() — prevents wiping sessionStorage on update
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return;
  if (!url.origin.includes('github.io') && !url.origin.includes('localhost')) return;

  // Network-first for HTML — always get latest version
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for icons, manifest
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
