import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo_medsest.png'],
      manifest: {
        name: 'MedSest Visita',
        short_name: 'MedSest',
        description: 'Gestão de visitas técnicas MedSest',
        lang: 'pt-BR', // o plugin assume 'en' se não for informado
        theme_color: '#1A3A5C',
        background_color: '#F8F9FA',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          // maskable: o Android recorta o ícone em círculo/squircle, então o
          // símbolo vem menor, dentro da zona segura
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache do app shell → recarregar offline não dá tela branca.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Rota de SPA (ex.: /visitas/abc) recarregada offline serve o index.html.
        navigateFallback: 'index.html',
        // ...mas /api e /uploads NÃO caem no index (são dados/arquivos, não telas).
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            // Fotos já sincronizadas: uuid no nome = imutável → CacheFirst.
            // É o que faz a foto abrir offline depois de vista uma vez.
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads-medsest',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // /api NÃO é cacheado pelo service worker de propósito: os dados offline
        // vêm do espelho IndexedDB (mais fresco e sob nosso controle). Cachear
        // /api aqui devolveria JSON velho, brigando com o espelho.
      },
      // SW desligado no dev (não precisa e atrapalha o HMR); só no build/preview.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  // O `vite preview` (build servido) usa seu próprio proxy — precisa dele para
  // testar o PWA de verdade contra o backend.
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
