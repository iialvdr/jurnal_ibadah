import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['img/**/*', 'assets/fonts/**/*'],
      manifest: {
        name: 'Jurnal Ibadah',
        short_name: 'Jurnal Ibadah',
        description: 'Teman setia dalam perjalanan spiritualmu untuk menjaga istiqomah setiap hari.',
        theme_color: '#10b981',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'img/favicon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'img/favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/api\.myquran\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'myquran-api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 } }
          },
          {
            urlPattern: /^https:\/\/equran\.id\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'equran-api-cache', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: { '@': '/src' }
  }
})
