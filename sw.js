import { APP_VERSION } from './js/version.js?v=2.6.4';

// SW Version trigger: 2.6.4
const CACHE_NAME = `jurnal-ibadah-${APP_VERSION}`;
const API_CACHE_NAME = `jurnal-ibadah-api-${APP_VERSION}`;

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/tailwind.build.css',
  './css/style.css',
  './assets/fonts/scheherazade-new-400.ttf',
  './assets/fonts/noto-naskh-arabic-400.ttf',

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

  './img/favicon/android-chrome-192x192.png',
  './img/favicon/web-app-manifest-192x192.png',
  './img/favicon/favicon-32x32.png',
  './img/favicon/favicon-16x16.png',
  './img/favicon/favicon.ico',
  './img/favicon/site.webmanifest'
];

const postSwVersionToClients = async (phase = 'runtime') => {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientList.forEach(client => {
    client.postMessage({
      type: 'sw-version',
      version: APP_VERSION,
      cacheName: CACHE_NAME,
      phase
    });
  });
};

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch('./index.html', { cache: 'no-store' })
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', cloned));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
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

  const isAppCodeRequest = (
    url.origin === self.location.origin &&
    event.request.method === 'GET' &&
    (
      url.pathname.includes('/views/') ||
      url.pathname.includes('/js/') ||
      url.pathname.includes('/css/') ||
      url.pathname.endsWith('/manifest.json')
    )
  );

  if (isAppCodeRequest) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          return cache.match(event.request);
        }
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
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
      .then(() => postSwVersionToClients('activate'))
  );
});

self.addEventListener('message', event => {
  if (!event?.data || event.data.type !== 'get-sw-version') return;
  const payload = {
    type: 'sw-version',
    version: APP_VERSION,
    cacheName: CACHE_NAME,
    phase: 'message'
  };

  if (event.source && typeof event.source.postMessage === 'function') {
    event.source.postMessage(payload);
    return;
  }

  event.waitUntil(postSwVersionToClients('message'));
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
