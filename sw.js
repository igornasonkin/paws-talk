/* Tiny service worker: network first, cached copy only when offline. Audio is never cached. */
var CACHE = 'walktalk-v7';
var SHELL = ['./', 'index.html', 'studio.html', 'style.css', 'player.js', 'dogs.js', 'studio.js', 'episodes.json', 'manifest.webmanifest', 'icon-192.png', 'studio.css'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || /\.mp3$/.test(u.pathname) || r.headers.has('range')) return;
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
    return res;
  }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('index.html'); }); }));
});
