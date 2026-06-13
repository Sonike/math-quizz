// Math Quizz service worker — hand-rolled, zero dependencies.
// Strategy: network-first for navigations (always-fresh shell when online,
// last-good shell when offline); cache-first for content-hashed assets,
// icons and the manifest (a cache hit is never stale — the filename encodes
// the content). Routing mirrors the unit-tested src/sw/cacheStrategy.ts.
const CACHE_NAME = 'mathquizz-v1';
const INDEX_KEY = './'; // canonical key for the app shell (any SPA route)

function cacheStrategyFor(request) {
  if (request.method !== 'GET') return 'pass';
  if (request.mode === 'navigate') return 'network-first';
  return 'cache-first';
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const strategy = cacheStrategyFor(event.request);
  if (strategy === 'pass') return;

  if (strategy === 'network-first') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const fresh = await fetch(event.request);
          cache.put(INDEX_KEY, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await cache.match(INDEX_KEY);
          if (cached) return cached;
          throw err;
        }
      })(),
    );
    return;
  }

  // cache-first
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const fresh = await fetch(event.request);
      if (fresh && fresh.status === 200) {
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    })(),
  );
});
