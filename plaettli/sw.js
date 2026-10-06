const CACHE = 'plaettli-v1.8';
const FILES = [
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/document.js',
  './js/renderer.js',
  './js/dither.js',
  './js/tools.js',
  './js/history.js',
  './js/input.js',
  './js/palette.js',
  './libs/idb-keyval.js',
  './libs/fflate.esm.js',
  './fonts/phosphor/Phosphor-Light.woff2',
  './fonts/phosphor/phosphor.css',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      for (const f of FILES) c.add(f).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => k !== CACHE && caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
