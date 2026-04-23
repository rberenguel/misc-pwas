const CACHE_NAME = 'ullada-v1.4.2';
const CACHE_FILES = [
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/app.js',
    './lib/jszip.min.js',
    './lib/haptic.js',
    './lib/idb-keyval.js',
    './lib/sentences.js',
    './fonts/inter.css',
    './fonts/InterDisplay-Regular.woff2',
    './fonts/InterDisplay-Bold.woff2',
    './fonts/InterDisplay-Italic.woff2',
    './icon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            for (const url of CACHE_FILES) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.warn('ullada SW: failed to cache', url, err);
                }
            }
            return self.skipWaiting();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names.map((n) => n !== CACHE_NAME && caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});
