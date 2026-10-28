// Bump CACHE together with VERSION in src/main.js (v5.8.5 <-> crowd-runner-v5-10-1).
var CACHE = 'crowd-runner-v5-10-2';
var ASSETS = ['./', './index.html', './style.css', './game.js', './install.js', './manifest.json',
  './fonts/LilitaOne-Regular.ttf', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // v5.8.1: version.json always straight from the network (never cached), so a stale client can find out it is stale
  if (/\/version\.json$/.test(url.pathname)) { e.respondWith(fetch(e.request, { cache: 'no-store' })); return; }
  var core = e.request.mode === 'navigate' || /\/(index\.html|game\.js|install\.js|style\.css|sw\.js)?$/.test(url.pathname);
  if (core) {
    // Network first for the app shell so updates show up on the next open; cache when offline.
    // v5.8.1: cache:'no-cache' revalidates with the server, so GitHub Pages' max-age=600 can't hand back a stale build
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (h) { return h || caches.match('./index.html'); }); }));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(e.request).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    }).catch(function () {
      if (e.request.mode === 'navigate') return caches.match('./index.html');
    });
  }));
});
