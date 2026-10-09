const CACHE = 'katze-work-hub-v3';
const BASE_PATH = '/katze-work-hub';
const FILES = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.webmanifest',
  BASE_PATH + '/icon.svg',
  BASE_PATH + '/assets/katze-logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(FILES).catch(() => {
        // Gracefully handle missing files
        return Promise.all(FILES.map(file =>
          cache.add(file).catch(() => {
            console.warn('Could not cache:', file);
          })
        ));
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Cache-first strategy for static assets
  if (url.pathname.startsWith(BASE_PATH)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          // Cache successful responses
          if (response.ok) {
            const cache_copy = response.clone();
            caches.open(CACHE).then(cache => {
              cache.put(event.request, cache_copy);
            });
          }
          return response;
        }).catch(() => {
          // Return cached version if offline
          return caches.match(event.request);
        });
      })
    );
  }
});