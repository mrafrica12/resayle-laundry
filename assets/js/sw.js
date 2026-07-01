/* ============================================================
   RESAYLE Laundry — Service Worker v1
   Offline-first caching for resilience during power outages
   ============================================================ */

const CACHE_VERSION = 'resayle-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/assets/css/main.css',
  '/assets/js/main.js',
  '/assets/js/config.js',
  '/assets/logo/logo.webp',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap',
];

// Install: cache the static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CACHE_URLS).catch((error) => {
        console.warn('⚠️ Some resources failed to cache during install:', error);
        // Continue even if some URLs fail (fonts might not be essential)
        return Promise.resolve();
      });
    })
  );
  // Activate immediately (don't wait for clients to close)
  self.skipWaiting();
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('resayle-') && name !== CACHE_VERSION)
          .map((name) => {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for dynamic
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle HTTP/HTTPS requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network requests (Apps Script, fetch calls for prices/orders)
  // → Try network first, fall back to offline stub
  if (request.method !== 'GET' ||
      url.hostname.includes('script.google.com') ||
      url.hostname.includes('googletagmanager.com')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Offline: return offline response for API calls
          return new Response(
            JSON.stringify({
              offline: true,
              message: 'You are offline. Data will sync when reconnected.',
            }),
            {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // Static shell (HTML, CSS, JS, fonts, images)
  // → Cache-first: serve from cache, update in background
  event.respondWith(
    caches.match(request).then((cached) => {
      // If in cache, serve it immediately
      if (cached) {
        return cached;
      }

      // Not in cache, try network (update cache if successful)
      return fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone and cache
          const responseToCache = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Offline and not in cache: return a minimal offline page
          return caches.match('/index.html').then((cached) => {
            if (cached) {
              return cached;
            }
            // Absolute fallback (shouldn't happen if install succeeded)
            return new Response('You are offline.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' },
            });
          });
        });
    })
  );
});
