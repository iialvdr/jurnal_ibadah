// Ganti versi cache agar browser mau mengambil file baru
const CACHE_NAME = 'jurnal-ibadah-v14'; 

const urlsToCache = [
  // 1. Root & Config
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  
  // 2. JavaScript Core
  './js/app.js',
  './js/config.js',
  './js/router.js',
  './js/state.js',

  // 3. JavaScript Modules (Wajib dicache agar fitur jalan offline)
  './js/modules/auth.js',
  './js/modules/home.js',
  './js/modules/profile.js',
  './js/modules/qibla.js',
  './js/modules/quran.js',
  './js/modules/tasbih.js',
  './js/modules/tracker.js',

  // 4. Views (HTML Files) - Ini yang berubah drastis dari versi lama
  './views/login.html',
  './views/home.html',
  './views/profile.html',
  './views/tasbih.html',
  './views/qibla.html',
  './views/tracker.html',
  './views/quran.html',

  // 5. Assets
  './assets/logo.png',
  './assets/favicon/android-chrome-192x192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
          console.log('Membuka cache');
          return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response dari cache
        if (response) {
          return response;
        }
        // Clone request karena request adalah stream dan hanya bisa dikonsumsi sekali
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Cek jika response valid
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response karena response adalah stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Cache request baru secara dinamis (opsional, tapi bagus untuk performa)
                // Hati-hati dengan request API/Firestore, sebaiknya difilter.
                // Disini kita biarkan sederhana dulu.
                 // cache.put(event.request, responseToCache); 
              });

            return response;
          }
        );
      })
  );
});

// Event Activate: Bersihkan cache lama agar storage user tidak penuh
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});