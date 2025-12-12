const CACHE_NAME = "puzzle-collection-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./maze.html",
  "./skyscrapers.html",
  "./slider.html",
  "./css/styles.css",
  "./lib/jszip.min.js",
  "./js/shared/app-manager.js",
  "./js/shared/epub-generator.js",
  "./js/maze.js",
  "./js/skyscrapers.js",
  "./js/slider.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});
