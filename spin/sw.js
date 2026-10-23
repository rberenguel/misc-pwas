const CACHE = 'spin-v0.1.20';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './main.js',
  './court.js',
  './cards.js',
  './state.js',
  './ai.js',
  './ui.js',
  './audio.js',
  './icon.png',
  './fonts/phosphor/phosphor.css',
  './fonts/phosphor/Phosphor-Light.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
