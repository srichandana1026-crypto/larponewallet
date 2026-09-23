const CACHE_NAME = 'larpwallet-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './landing.css',
  './hub.css',
  './larppay.css',
  './styles-BxNiFifO.css',
  './app.js',
  './shopify-simulator.html',
  './phantom-wallet-simulator.html',
  './cashapp-simulator.html',
  './terms-and-conditions.html',
  './privacy-policy.html',
  './manifest-shopify.webmanifest',
  './manifest-phantom.webmanifest',
  './manifest-cashapp.webmanifest',
  './favicon.png',
  './shopify app icon.jpg',
  './phantom app icon.jpg',
  './cash app icon.jpg',
  './ecom.png',
  './crypto.png',
  './cash.png',
  './bank_icon.png',
  './qr_icon.png',
  './smiley_icon.png',
  './bitcoin-logo.png',
  './ethereum-logo.png',
  './solana-logo.png',
  './usdc-logo.png',
  './usdt-logo.png',
  './polygon-logo.png',
  './shopify logo.png',
  './shopify green logo.webp',
  './shopify_sale_sound.mp3',
  './phantom logo.png',
  './cash app.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to precache during install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background for non-critical assets
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => { });
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
