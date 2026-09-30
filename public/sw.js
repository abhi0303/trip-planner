/**
 * Enough service worker to open the app with no connection at all.
 *
 * The shell alone was not enough: a cached page still asks for the script and
 * stylesheet it was built with, and those requests never reached this worker,
 * so an offline reload painted nothing. The bundle is content-hashed, so once
 * a version is on disk it can be served from there without checking.
 *
 * The API is deliberately absent. Trip data is live and is cached in
 * IndexedDB by the app itself, which knows what is safe to keep and for whom.
 * Anything served stale from here would be invisible to that.
 */
const SHELL_CACHE = 'ts-shell-v2';
const ASSET_CACHE = 'ts-assets-v2';
const MEDIA_CACHE = 'ts-media-v2';
const KEEP = [SHELL_CACHE, ASSET_CACHE, MEDIA_CACHE];

const SHELL = './';

/** Replaced at build time with the hashed bundle filenames. */
self.__PRECACHE__ = [];
const PRECACHE = self.__PRECACHE__;

/** Photos would otherwise grow without limit; the feed only shows so many. */
const MAX_MEDIA = 48;
/**
 * Bundles are content-hashed, so every deploy leaves its predecessor behind.
 * Install writes the current ones last and trimming takes the oldest first, so
 * what the app is running is never the thing evicted.
 */
const MAX_ASSETS = 30;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await caches.open(SHELL_CACHE).then((cache) => cache.add(SHELL));
    // Best effort: one asset that fails to fetch must not abandon the install
    // and leave the app with no worker at all.
    if (PRECACHE.length) {
      const assets = await caches.open(ASSET_CACHE);
      await Promise.all(PRECACHE.map((url) => assets.add(url).catch(() => {})));
      void trim(ASSET_CACHE, MAX_ASSETS);
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Oldest first — `keys()` returns insertion order, which is close enough to age. */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)));
}

/**
 * Served from disk when present, fetched and kept when not. Used for things
 * whose URL identifies their content: hashed bundles, fonts, uploaded photos.
 */
async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  // `opaque` is a cross-origin image fetched without CORS: unreadable here,
  // still perfectly displayable, and worth keeping.
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone());
    if (max) void trim(cacheName, max);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navigations: always try the network so a deploy is picked up, and fall
  // back to the last shell when there is nothing to reach.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL, copy));
          }
          return response;
        })
        .catch(() => caches.match(SHELL).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  const { destination } = request;

  if (destination === 'script' || destination === 'style' || destination === 'font') {
    event.respondWith(cacheFirst(request, ASSET_CACHE, MAX_ASSETS).catch(() => Response.error()));
    return;
  }

  if (destination === 'image') {
    event.respondWith(cacheFirst(request, MEDIA_CACHE, MAX_MEDIA).catch(() => Response.error()));
  }

  // Everything else — the API included — goes straight to the network.
});
