// --- PWA OFFLINE CACHE LOGIC ---
const CACHE_NAME = 'mvcp-benin-cache-v2'; // Incremented version
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo192.png',
  '/logo512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching App Shell');
      return cache.addAll(STATIC_ASSETS).catch(error => {
        console.error('Failed to cache static assets:', error);
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Use a network-first strategy for most requests to ensure fresh data.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If the request is successful, cache a clone of the response for offline fallback.
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          // Cache successful GET requests only.
          if (event.request.method === 'GET' && response.status === 200) {
            cache.put(event.request, responseToCache);
          }
        });
        return response;
      })
      .catch(() => {
        // If the network request fails (e.g., offline), try to serve the response from the cache.
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          // Optional: return a custom offline page here if you have one cached.
        });
      })
  );
});