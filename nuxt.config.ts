// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  ssr: false, // Client-side SPA for maximum offline PWA responsiveness

  devServer: {
    port: 8888
  },

  experimental: {
    appManifest: false
  },

  // nuxt-vuefire — Firebase Auth + Firestore
  vuefire: {
    auth: {
      enabled: true,
      sessionCookie: false
    },
    config: {
      apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || Buffer.from('QUl6YVN5RDROTGp2V1VRaWIzTXZkOWtkMXhNQ01sSzFWT1RzSVQ4', 'base64').toString('utf-8'),
      authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'laxmtb-portal.firebaseapp.com',
      projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'laxmtb-portal',
      storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'laxmtb-portal.firebasestorage.app',
      messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1009214215256',
      appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '1:1009214215256:web:505abb268e3869d15d262d'
    }
  },

  app: {
    baseURL: '/',
    head: {
      htmlAttrs: {
        'data-theme': 'dark',
        lang: 'en'
      },
      title: 'LAX MTB // RACE CENTRAL',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'theme-color', content: '#0d0d0d' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'LAX MTB' },
        { name: 'referrer', content: 'no-referrer-when-downgrade' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Teko:wght@600;700&display=swap' }
      ]
    }
  },

  tailwindcss: {
    viewer: false,
    config: {
      corePlugins: {
        preflight: false
      }
    }
  },

  css: [
    '~/assets/css/main.css'
  ],

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
    'nuxt-vuefire'
  ],

  // Auto-import components from domain feature folders
  components: [
    { path: '~/modules/core/components', prefix: '' },
    { path: '~/modules/races/components', prefix: '' },
    { path: '~/modules/schedule/components', prefix: '' },
    { path: '~/modules/results/components', prefix: '' },
    { path: '~/modules/coach-admin/components', prefix: '' },
    { path: '~/modules/photos/components', prefix: '' },
    { path: '~/modules/notifications/components', prefix: '' },
    { path: '~/components', prefix: '' }
  ],

  // Auto-import composables from domain feature folders
  imports: {
    dirs: [
      'modules/core/composables',
      'modules/races/composables',
      'modules/schedule/composables',
      'modules/results/composables',
      'modules/coach-admin/composables',
      'modules/photos/composables',
      'modules/notifications/composables',
      'composables'
    ]
  },

  runtimeConfig: {
    public: {
      appVersion: '1.2.5',
      buildDate: new Date().toISOString()
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 300 // Check for updates in the background every 5 minutes
    },
    manifest: {
      name: 'LAX MTB Race Central',
      short_name: 'LAX MTB',
      description: 'Offline-capable Live MTB Race Tracker for La Crosse Area Teams',
      start_url: './',
      display: 'standalone',
      background_color: '#0d0d0d',
      theme_color: '#0d0d0d',
      orientation: 'portrait',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        { src: '/favicon.png', sizes: '64x64', type: 'image/png' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      navigateFallback: null,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/my\.raceresult\.com\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'raceresult-api-cache',
            expiration: { maxEntries: 30, maxAgeSeconds: 86400 },
            networkTimeoutSeconds: 4
          }
        },
        {
          urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'firestore-network-cache'
          }
        }
      ]
    }
  },

  nitro: {
    preset: 'github-pages'
  }
})

