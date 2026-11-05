import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

function tanyaQuranDevApi() {
  return {
    name: 'tanya-quran-dev-api',
    async configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      if (!process.env.GROQ_API_KEY) {
        process.env.GROQ_API_KEY = env.GROQ_API_KEY || env.VITE_GROQ_API_KEY
      }

      const { default: handler } = await import('./api/tanya-quran.js')
      server.middlewares.use('/api/tanya-quran', async (req, res, next) => {
        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Format permintaan tidak valid.' }))
          return
        }

        res.status = (statusCode) => {
          res.statusCode = statusCode
          return res
        }
        res.json = (body) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
          return res
        }

        try {
          await handler(req, res)
        } catch (error) {
          next(error)
        }
      })
    }
  }
}

const commonProxyConfig = {
  changeOrigin: true,
  configure: (proxy, options) => {
    proxy.on('proxyReq', (proxyReq, req, res) => {
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
      proxyReq.setHeader('Referer', 'https://www.google.com/');
      proxyReq.setHeader('Origin', 'https://www.google.com');
    });
  }
};

export default defineConfig({
  server: {
    proxy: {
      '/api/artikel-islam': {
        target: 'https://artikel-islam.netlify.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/artikel-islam/, '/.netlify/functions/api')
      },
      '/proxy/fir': { target: 'https://firanda.com', ...commonProxyConfig, rewrite: (p) => p.replace(/^\/proxy\/fir/, '') },
      '/proxy/rum': { target: 'https://rumaysho.com', ...commonProxyConfig, rewrite: (p) => p.replace(/^\/proxy\/rum/, '') },
      '/proxy/ks': { target: 'https://konsultasisyariah.com', ...commonProxyConfig, rewrite: (p) => p.replace(/^\/proxy\/ks/, '') },
      '/proxy/msh': { target: 'https://muslimah.or.id', ...commonProxyConfig, rewrite: (p) => p.replace(/^\/proxy\/msh/, '') },
      '/proxy/ms': { target: 'https://muslim.or.id', ...commonProxyConfig, rewrite: (p) => p.replace(/^\/proxy\/ms(?:\/|$)/, '/') },
      '/proxy/maf': { target: 'https://muslimafiyah.com', ...commonProxyConfig, rewrite: (p) => p.replace(/^\/proxy\/maf/, '') },
      '/proxy/kj': { target: 'https://khotbahjumat.com', ...commonProxyConfig, rewrite: (p) => p.replace(/^\/proxy\/kj/, '') }
    }
  },
  plugins: [
    basicSsl(),
    tailwindcss(),
    react(),
    tanyaQuranDevApi(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
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
        enabled: false,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: { '@': '/src' }
  }
})
