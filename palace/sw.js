// Generated with get_cache.go — run `go run get_cache.go` to regenerate.
const CACHE_NAME = "palace-v0.3.6";
const CACHE_FILES = [
  './css/style.css',
  './icon.png',
  './fonts/phosphor/Phosphor-Light.woff2',
  './fonts/phosphor/phosphor.css',
  './index.html',
  './loci-editor.html',
  './js/app.js',
  './js/data.js',
  './js/radar.js',
  './js/stats.js',
  './js/ui-stats.js',
  './libs/haptic.js',
  './libs/idb-keyval.js',
  './manifest.json',
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of CACHE_FILES) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn("palace SW: failed to cache", url, err);
        }
      }
      return self.skipWaiting();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.map((n) => n !== CACHE_NAME && caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});
