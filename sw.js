import { APP_VERSION } from './js/version.js';

const CACHE_NAME = `jurnal-ibadah-${APP_VERSION}`;
const API_CACHE_NAME = `jurnal-ibadah-api-${APP_VERSION}`;

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',

  './js/app.js',
  './js/config.js',
  './js/router.js',
  './js/state.js',
  './js/version.js',

  './js/modules/auth.js',
  './js/modules/home.js',
  './js/modules/profile.js',
  './js/modules/qibla.js',
  './js/modules/quran.js',
  './js/modules/tasbih.js',
  './js/modules/tracker.js',
  './js/modules/doa.js',
  './js/modules/asmaul_husna.js',
  './js/modules/fasting.js',

  './views/login.html',
  './views/home.html',
  './views/profile.html',
  './views/tasbih.html',
  './views/qibla.html',
  './views/tracker.html',
  './views/quran.html',
  './views/doa.html',
  './views/asmaul_husna.html',
  './views/fasting.html',
  './views/credits.html',

  './assets/logo.png',
  './assets/favicon/android-chrome-192x192.png',
  './assets/favicon/android-chrome-512x512.png',
  './assets/favicon/favicon-32x32.png',
  './assets/favicon/favicon-16x16.png',
  './assets/favicon/favicon.ico'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Paksa update segera
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Install SW Versi:', APP_VERSION);
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Strategi Cache-First untuk API Publik (EQuran & GitHub)
  if (url.origin === 'https://equran.id' || url.href.includes('githubusercontent.com') || url.href.includes('api.bigdatacloud.net')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) return response;
          return fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => { });
        });
      })
    );
    return;
  }

  // Strategi Default: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Hapus Cache Lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Mengambil kendali atas semua klien/halaman segera setelah SW aktif
      return self.clients.claim();
    })
  );
});