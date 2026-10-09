const CACHE = 'katze-work-hub-v3';
const BASE_PATH = '/katze-work-hub';
const FILES = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.webmanifest',
  BASE_PATH + '/icon.svg',
  BASE_PATH + '/icon-192.png',
  BASE_PATH + '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(FILES).catch(() => {
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
  
  if (url.origin !== self.location.origin) {
    return;
  }
  
  if (url.pathname.startsWith(BASE_PATH)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          if (response.ok) {
            const cache_copy = response.clone();
            caches.open(CACHE).then(cache => {
              cache.put(event.request, cache_copy);
            });
          }
          return response;
        }).catch(() => {
          return caches.match(event.request);
        });
      })
    );
  }
});