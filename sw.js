import { APP_VERSION } from './js/version.js';

const CACHE_NAME = `jurnal-ibadah-${APP_VERSION}`;
const API_CACHE_NAME = `jurnal-ibadah-api-${APP_VERSION}`;

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/tailwind.build.css',
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
  './js/modules/hadith.js',
  './js/modules/credits.js',
  './js/modules/changelog.js',
  './js/modules/zakat.js',
  './js/modules/faq.js',
  './js/modules/push.js',

  './views/login.html',
  './views/home.html',

  './img/logo.png',
  './img/favicon/android-chrome-192x192.png',
  './img/favicon/android-chrome-512x512.png',
  './img/favicon/web-app-manifest-192x192.png',
  './img/favicon/web-app-manifest-512x512.png',
  './img/favicon/favicon-32x32.png',
  './img/favicon/favicon-16x16.png',
  './img/favicon/favicon.svg',
  './img/favicon/favicon.ico',
  './img/favicon/site.webmanifest'
];

self.addEventListener('install', event => {
  self.skipWaiting();
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

  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(response => {
        if (response) return response;
        return fetch(event.request).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

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

  if (url.origin === self.location.origin && event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const networkFetch = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || networkFetch;
        });
      })
    );
    return;
  }

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
      return self.clients.claim();
    })
  );
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Pengingat Ibadah';
  const options = {
    body: payload.body || 'Waktu ibadah telah tiba.',
    icon: './img/favicon/android-chrome-192x192.png',
    badge: './img/favicon/favicon-32x32.png',
    vibrate: [200, 100, 200],
    tag: payload.tag || 'jurnal-ibadah-push',
    renotify: true,
    data: {
      url: payload.url || './'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      clientList.forEach(client => client.postMessage({ type: 'push-subscription-changed' }));
    })
  );
});
