var CACHE_NAME = 'tehilim-v7-oro';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './data/data.js',
  './data/cards.js',
  './js/share.js',
  './fonts/cormorant-garamond-latin-500-normal.woff2',
  './fonts/cormorant-garamond-latin-600-normal.woff2',
  './fonts/cormorant-garamond-latin-700-normal.woff2',
  './fonts/cormorant-garamond-latin-500-italic.woff2',
  './fonts/cormorant-garamond-latin-600-italic.woff2',
  './fonts/montserrat-latin-500-normal.woff2',
  './fonts/montserrat-latin-600-normal.woff2',
  './fonts/montserrat-latin-700-normal.woff2',
  './fonts/frank-ruhl-libre-hebrew-500-normal.woff2',
  './fonts/frank-ruhl-libre-hebrew-700-normal.woff2',
  './img/logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        return response;
      }).catch(function () {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
