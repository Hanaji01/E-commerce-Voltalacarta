const CACHE_NAME = 'volta-la-carta-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/bouquet.html',
  '/fiorisingoli.html',
  '/carrello.html',
  '/login.html',
  '/css/stile.css',
  '/js/index.js',
  '/js/cart_global.js',
  '/js/script.js',
  '/logo.jpg',
  '/immagini/galleria/rosa.webp',
  '/immagini/galleria/girasole.webp',
  '/immagini/galleria/erica.webp',
  '/immagini/galleria/bacche.webp',
  '/immagini/galleria/dalia.webp',
  '/immagini/galleria/margherita.webp',
  '/immagini/icons/account.png',
  '/immagini/icons/shop.png',
];

// Installazione: metti in cache le risorse statiche
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Attivazione: elimina le vecchie cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: prima dalla cache, poi dalla rete
self.addEventListener('fetch', event => {
  // Non intercettare le chiamate API
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Metti in cache solo risposte valide
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline: se è una pagina HTML mostra la home dalla cache
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});