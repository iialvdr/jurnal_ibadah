import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// 1. Precaching (File statis seperti js, css, html, gambar)
precacheAndRoute(self.__WB_MANIFEST);

// 2. Runtime Caching (Sama dengan konfigurasi VitePWA sebelumnya)
// Google Fonts
registerRoute(
    /^https:\/\/fonts\.googleapis\.com\/.*/i,
    new CacheFirst({
        cacheName: 'google-fonts-cache',
        plugins: [
            new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })
        ]
    })
);

// MyQuran API (Jadwal Sholat, dll - Berubah setiap hari)
registerRoute(
    /^https:\/\/api\.myquran\.com\/.*/i,
    new NetworkFirst({
        cacheName: 'myquran-api-cache',
        plugins: [
            new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })
        ]
    })
);

// EQuran API (Isi Al-Quran - Tidak pernah berubah)
registerRoute(
    /^https:\/\/equran\.id\/.*/i,
    new CacheFirst({
        cacheName: 'equran-api-cache',
        plugins: [
            new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 })
        ]
    })
);

// 3. Web Push Notifications
self.addEventListener('push', function(event) {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Jurnal Ibadah', body: event.data.text() };
        }
    } else {
        data = { title: 'Waktu Sholat', body: 'Sudah masuk waktu sholat.' };
    }

    const options = {
        body: data.body,
        icon: '/img/favicon/android-chrome-192x192.png',
        badge: '/img/favicon/favicon-32x32.png',
        data: data.url || '/',
        vibrate: [200, 100, 200, 100, 200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 4. Tindakan saat notifikasi di-klik
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const urlToOpen = event.notification.data || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Jika tab aplikasi sudah terbuka, fokuskan ke tab itu
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Jika belum terbuka, buka tab baru
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
