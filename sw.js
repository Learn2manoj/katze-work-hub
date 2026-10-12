/* KATZE Work Hub service worker.
   Bump VERSION on every deployment so installed copies pick up the new files. */
'use strict';

const VERSION = '1.0.0';
const CACHE_PREFIX = 'katze-work-hub-';
const CACHE_NAME = CACHE_PREFIX + VERSION;

// Relative to the service worker's scope (/katze-work-hub/ on GitHub Pages).
const PRECACHE = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'assets/katze-logo.png',
  'assets/icon-192.png',
  'assets/icon-512.png'
];

const scoped = (path) => new URL(path, self.registration.scope).toString();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache:'reload' bypasses the HTTP cache so a new version never precaches stale files
      Promise.all(PRECACHE.map((p) => cache.add(new Request(scoped(p), { cache: 'reload' }))))
    )
  );
  // No automatic skipWaiting: the page offers a "Reload" button instead (see SKIP_WAITING below).
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle this app's own files. The external work applications are never intercepted or cached.
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request, url));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, request));
});

async function networkFirstPage(request, url) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    const isHome = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
    if (response && response.ok && isHome) cache.put(scoped('index.html'), response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(scoped('index.html'));
    return cached || new Response('Katze Work Hub is offline and has not been cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return (await refresh) || new Response('', { status: 504 });
}
