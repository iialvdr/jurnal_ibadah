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
      injectRegister: 'script',
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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: { '@': '/src' }
  }
})
