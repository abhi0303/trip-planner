/**
 * Just enough service worker to make the site installable and to open offline.
 *
 * Page navigations go to the network first and fall back to the last cached
 * shell. Everything else, the API included, is left to the browser: the data
 * is live and must never be served stale from here.
 */
const CACHE = 'ts-shell-v1';
const SHELL = './';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
        }
        return response;
      })
      .catch(() => caches.match(SHELL).then((cached) => cached ?? Response.error())),
  );
});
