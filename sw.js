const CACHE_NAME = 'jurnal-ibadah-v6'; 

const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/views/view_login.js',
  './js/views/view_profile.js',
  './js/views/view_tasbih.js',
  './js/views/view_home.js',
  './js/views/view_qibla.js',
  './js/views/view_tracker.js',
  './assets/logo.png',
  './manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch Data (Agar bisa jalan offline terbatas)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});