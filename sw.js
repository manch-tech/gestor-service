const CACHE_NAME = 'gestor-service-v4-no-adm';
const GHPATH = '/gestor-service';
const ASSETS = [
  `${GHPATH}/`,
  `${GHPATH}/index.html`,
  `${GHPATH}/manifest.webmanifest`,
  `${GHPATH}/icon-192.png`,
  `${GHPATH}/icon-512.png`,
  `${GHPATH}/icon-192-maskable.png`,
  `${GHPATH}/icon-512-maskable.png`
];

// Se tiver shared.js, tenta cachear também, mas não quebra se não existir
const OPTIONAL = [`${GHPATH}/shared.js`];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(ASSETS);
      // tenta opcionais sem falhar
      for (const url of OPTIONAL) {
        try { await cache.add(url); } catch(err) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
