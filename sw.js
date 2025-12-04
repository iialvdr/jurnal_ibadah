import { APP_VERSION } from './js/version.js';

// Gunakan variabel versi untuk nama cache
const CACHE_NAME = `jurnal-ibadah-${APP_VERSION}`;

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

  './views/login.html',
  './views/home.html',
  './views/profile.html',
  './views/tasbih.html',
  './views/qibla.html',
  './views/tracker.html',
  './views/quran.html',
  './views/doa.html',
  './views/asmaul_husna.html',
  
  // [PERBAIKAN DI SINI]
  // Hapus baris './assets/icons/...' karena file tidak ada
  // Pastikan path ini sesuai dengan file yang kamu upload
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
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(
          response => {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
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