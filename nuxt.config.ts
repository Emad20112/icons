// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: false },

  modules: [
    '@nuxtjs/tailwindcss'
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Digital Assets Platform - Foundation',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          name: 'description', 
          content: 'Production-ready, extensible digital assets platform architecture supporting Icons, Fonts, Illustrations, Logos, and Templates with Vue 3, Nuxt 4, Tailwind CSS, and Supabase.' 
        },
        { property: 'og:title', content: 'Digital Assets Platform - Foundation' },
        { 
          property: 'og:description', 
          content: 'Production-ready digital assets platform architecture supporting Icons, Fonts, Illustrations, Logos, and Templates.' 
        }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },

  runtimeConfig: {
    // Private server-only keys (NEVER exposed to client bundle)
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    securityMaxFileSizeBytes: Number(process.env.SECURITY_MAX_FILE_SIZE_BYTES) || 52428800,
    rateLimitMaxRequests: Number(process.env.SECURITY_RATE_LIMIT_MAX_REQUESTS) || 100,
    rateLimitWindowMs: Number(process.env.SECURITY_RATE_LIMIT_WINDOW_MS) || 60000,

    // Public keys exposed to client
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Digital Assets Platform',
      appEnv: process.env.NUXT_PUBLIC_APP_ENV || 'development',
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://mock-project.supabase.co',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-token',
      storageAssetsBucket: process.env.NUXT_PUBLIC_STORAGE_ASSETS_BUCKET || 'assets',
      storageTempBucket: process.env.NUXT_PUBLIC_STORAGE_TEMP_BUCKET || 'temp-uploads',
    }
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
      }
    }
  }
})
