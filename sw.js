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

  './assets/logo.png',
  './assets/favicon/android-chrome-192x192.png',
  './assets/favicon/android-chrome-512x512.png',
  './assets/favicon/favicon-32x32.png',
  './assets/favicon/favicon-16x16.png',
  './assets/favicon/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Membuka cache versi:', APP_VERSION);
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // [OPTIMASI] Strategi Cache-First untuk API Publik (EQuran & GitHub)
  // Data ini jarang berubah, jadi aman di-cache agar akses berikutnya INSTANT & OFFLINE-READY
  if (url.origin === 'https://equran.id' || url.href.includes('githubusercontent.com') || url.href.includes('api.bigdatacloud.net')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          // Jika ada di cache, kembalikan cache (Instant)
          if (response) return response;

          // Jika tidak, fetch dari internet lalu simpan ke cache
          return fetch(event.request).then(networkResponse => {
            // Pastikan respon valid sebelum di-cache
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Jika fetch gagal (offline) dan tidak ada di cache, biarkan error (atau return fallback json)
            // Untuk sekarang kita biarkan default error browser
          });
        });
      })
    );
    return;
  }

  // Strategi Default: Stale-While-Revalidate untuk aset lokal
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
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});