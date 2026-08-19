async function getCacheName() {
  const manifest = await fetch("./manifest.json")
    .then((r) => r.json())
    .catch(() => ({}));
  const version = manifest.version || "0.0.0";
  return `mus-v${version}`;
}

const CACHE_FILES = [
  "./index.html",
  "./src/css/style.css",
  "./src/js/app.js",
  "./fonts/phosphor/Phosphor-Light.woff2",
  "./fonts/phosphor/phosphor.css",
  "./manifest.json",
  "./icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cacheName = await getCacheName();
      const cache = await caches.open(cacheName);
      for (const url of CACHE_FILES) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn("mus SW: failed to cache", url, err);
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
    (async () => {
      const cacheName = await getCacheName();
      const names = await caches.keys();
      await Promise.all(
        names.map((n) => n !== cacheName && caches.delete(n)),
      );
      return self.clients.claim();
    })(),
  );
});
