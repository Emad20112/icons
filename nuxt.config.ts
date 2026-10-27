// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n'
  ],

  css: ['~/assets/css/main.css'],

  i18n: {
    // Keep the existing URL structure (`/`, `/assets/:id`, `/admin`).
    // The locale lives in a cookie negotiated server-side, so SSR renders
    // the correct `lang`/`dir` on the very first paint (no RTL flash).
    strategy: 'no_prefix',
    defaultLocale: 'en',
    // Locale JSON lives in `i18n/locales` (the default `restructureDir`).
    langDir: 'locales',
    // Required by `useLocaleHead(seo)` to emit `og:url` and the canonical link
    // (it skips both, with a warning, when this is empty).
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    locales: [
      // Without `file` no messages are bundled and every `t()` call renders the
      // raw key — the build still succeeds, so this is easy to miss.
      { code: 'en', language: 'en-US', name: 'English', dir: 'ltr', file: 'en.json' },
      { code: 'ar', language: 'ar-SA', name: 'العربية', dir: 'rtl', file: 'ar.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false
    },
    bundle: { optimizeTranslationDirective: false }
  },

  app: {
    head: {
      // Server-side fallback only: `app.vue` overrides this from the
      // negotiated locale via `hreflangLinks` + `htmlAttrs`.
      htmlAttrs: { lang: 'en', dir: 'ltr' },
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
        },
        { property: 'og:locale', content: 'en_US' }
      ],
      link: [
        // Inline data URI: the project ships no `public/favicon.svg`, and a
        // missing icon produced a 404 on every page load.
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%232563eb'/%3E%3Cpath d='M12 4 4 8l8 4 8-4-8-4Z' fill='%23fff'/%3E%3Cpath d='m4 12 8 4 8-4' stroke='%23fff' stroke-width='1.6' fill='none'/%3E%3Cpath d='m4 16 8 4 8-4' stroke='%23fff' stroke-width='1.6' fill='none'/%3E%3C/svg%3E"
        }
      ]
    }
  },

  runtimeConfig: {
    // Private server-only keys (NEVER exposed to client bundle)
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
    securityMaxFileSizeBytes: Number(process.env.SECURITY_MAX_FILE_SIZE_BYTES) || 52428800,
    rateLimitMaxRequests: Number(process.env.SECURITY_RATE_LIMIT_MAX_REQUESTS) || 100,
    rateLimitWindowMs: Number(process.env.SECURITY_RATE_LIMIT_WINDOW_MS) || 60000,

    // Public keys exposed to client
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Digital Assets Platform',
      appEnv: process.env.NUXT_PUBLIC_APP_ENV || 'development',
      // Absolute origin for canonical/hreflang links (no trailing slash).
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mock-project.supabase.co',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-token',
      storageAssetsBucket: process.env.NUXT_PUBLIC_STORAGE_ASSETS_BUCKET || 'assets',
      storageTempBucket: process.env.NUXT_PUBLIC_STORAGE_TEMP_BUCKET || 'temp-uploads',
    }
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    } as any
  }
})
