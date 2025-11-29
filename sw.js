// Ganti nama cache biar fresh
const CACHE_NAME = 'jurnal-ibadah-v11'; 

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
  './js/views/view_quran.js',
  './assets/logo.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});