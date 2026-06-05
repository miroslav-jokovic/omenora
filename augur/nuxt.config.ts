// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  css: ['~/assets/css/editorial.css'],

  modules: [
    '@nuxt/fonts',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    'motion-v/nuxt',
    ...(process.env.SENTRY_DSN ? ['@nuxtjs/sentry'] : []),
  ],

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  fonts: {
    families: [
      {
        name: 'Onest',
        provider: 'google',
        weights: [200, 300, 400, 500, 600],
        styles: ['normal'],
      },
      {
        name: 'Geist Mono',
        provider: 'google',
        weights: [300, 400, 500],
        styles: ['normal'],
      },
    ],
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ['normal', 'italic'],
      formats: ['woff2'],
      preload: true,
    },
  },

  runtimeConfig: {
    // Empty string defaults — Nitro reads the actual process.env at container
    // startup (runtime), not at Docker build time when secrets are not present.
    // Railway variable names stay exactly as set: ANTHROPIC_API_KEY, etc.
    anthropicApiKey: '',
    stripeSecretKey: '',
    resendApiKey: '',
    supabaseUrl: '',
    supabaseServiceKey: '',
    stripeDailyPriceId: '', // DEPRECATED — keep for backward compat until B1b cleanup
    stripePremiumMonthlyPriceId: '', // NUXT_STRIPE_PREMIUM_MONTHLY_PRICE_ID — $14.99/mo Premium
    stripePremiumYearlyPriceId: '',  // NUXT_STRIPE_PREMIUM_YEARLY_PRICE_ID  — $99.99/yr Premium
    stripeCompatSinglePriceId: '',
    stripeFoundingPriceId: '',
    emailJobSecret: '',
    cronSecret: '',
    inngestEventKey: '',
    inngestSigningKey: '',
    stripeWebhookSecret: '',
    resendWebhookSecret: '',
    revenuecatWebhookSecret: '',
    redisUrl: '',
    adminSecret: '',
    appleSiwaTeamId: '',
    appleSiwaKeyId: '',
    appleSiwaPrivateKey: '',
    appleSiwaClientId: '',
    public: {
      stripePublishableKey: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      siteUrl: 'https://omenora.com',
      sentryDsn: '',
      tiktokPixelId: '',
      metaPixelId: '',
      posthogKey: '',
      clarityProjectId: '',
      googlePlacesKey: process.env.NUXT_PUBLIC_GOOGLE_PLACES_KEY || '',
    },
  },

  nitro: {
    preset: 'node-server',
    experimental: {
      wasm: true,
    },
    errorHandler: '~~/server/error-handler',
    // sweph is a native Node.js addon (node-gyp-build). Bundling it breaks the
    // __dirname-based prebuild resolution at runtime. Mark it external so Nitro
    // emits a real require('sweph') that resolves from node_modules at runtime.
    externals: {
      external: ['sweph', 'node-gyp-build'],
    },
  },

  routeRules: {
    '/api/**': {
      cors: false,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
      },
    },
    '/compatibility-quiz-legacy': { redirect: { to: '/compatibility-quiz', statusCode: 301 } },
    '/compatibility-quiz-v2': { redirect: { to: '/compatibility-quiz', statusCode: 301 } },
  },

  // @ts-ignore - @nuxtjs/sentry module extends NuxtConfig type
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    publishRelease: {
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
    config: {
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.0,
      replaysOnErrorSampleRate: 1.0,
    },
  },

  vite: {
    optimizeDeps: {
      exclude: ['canvas'],
    },
    build: {
      sourcemap: false,
    },
  },

  app: {
    head: {
      titleTemplate: '%s',
      title: 'OMENORA — AI Personality & Astrology Reading',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
        {
          name: 'description',
          content:
            'Discover your personality archetype through astrology, numerology, and six ancient traditions. AI-generated reading in 60 seconds. No account required.',
        },
        { name: 'theme-color', content: '#F2EBDD' },
        { name: 'msapplication-TileColor', content: '#F2EBDD' },
        { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' },
        { name: 'author', content: 'OMENORA' },
        { name: 'copyright', content: '© 2026 OMENORA. All rights reserved.' },
        { name: 'application-name', content: 'OMENORA' },
        { name: 'apple-mobile-web-app-title', content: 'OMENORA' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        // Open Graph defaults
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'OMENORA' },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:url', content: 'https://omenora.com' },
        {
          property: 'og:title',
          content: 'OMENORA — AI Personality & Astrology Reading',
        },
        {
          property: 'og:description',
          content:
            'Discover your personality archetype through astrology, numerology, and six ancient traditions. AI-generated reading in 60 seconds. No account required.',
        },
        { property: 'og:image', content: 'https://omenora.com/og-image.png' },
        { property: 'og:image:secure_url', content: 'https://omenora.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'OMENORA — AI Personality & Astrology Reading' },
        { property: 'og:image:type', content: 'image/png' },
        // Twitter / X
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@omenora' },
        { name: 'twitter:creator', content: '@omenora' },
        { name: 'twitter:title', content: 'OMENORA — AI Personality & Astrology Reading' },
        {
          name: 'twitter:description',
          content:
            'Discover your personality archetype using astrology and numerology. Free AI reading in 60 seconds. No account required.',
        },
        { name: 'twitter:image', content: 'https://omenora.com/og-image.png' },
        { name: 'twitter:image:alt', content: 'OMENORA — AI Personality & Astrology Reading' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
        { rel: 'icon', href: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { rel: 'icon', href: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'sitemap', type: 'application/xml', href: 'https://omenora.com/sitemap.xml' },
        // Hero LCP imagery — preload the WebP background used by SectionHero
        // (CSS background-image via --section-img custom property). A single
        // preload without `media` is correct here because SectionHero always
        // renders the same image at all breakpoints; position shifts via CSS.
        { rel: 'preload', as: 'image', href: '/images/hero/Cosmic-gold-ascension.webp', type: 'image/webp', fetchpriority: 'high' },
        // Performance: Preconnect to critical third-party domains
        { rel: 'preconnect', href: 'https://js.stripe.com' },
        { rel: 'preconnect', href: 'https://api.stripe.com' },
        { rel: 'dns-prefetch', href: 'https://js.stripe.com' },
        { rel: 'dns-prefetch', href: 'https://api.stripe.com' },
        { rel: 'preconnect', href: 'https://www.googletagmanager.com' },
        { rel: 'dns-prefetch', href: 'https://www.googletagmanager.com' },
      ],
      script: [
        // Google Analytics 4 — standard gtag.js snippet (production only)
        ...(process.env.NODE_ENV === 'production' ? [
          {
            src: 'https://www.googletagmanager.com/gtag/js?id=G-62M5LR63FH',
            async: true,
          },
          {
            textContent: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-62M5LR63FH');`,
          },
        ] : []),
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                '@id': 'https://omenora.com/#website',
                url: 'https://omenora.com',
                name: 'OMENORA',
                description: 'AI-powered personality and astrology readings. Natal chart calculations across 6 ancient traditions — Western, Vedic, BaZi, Tarot, Korean and Middle Eastern. Reading ready in 60 seconds.',
                inLanguage: 'en',
                publisher: { '@id': 'https://omenora.com/#organization' },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://omenora.com/analysis?q={search_term_string}',
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@type': 'Organization',
                '@id': 'https://omenora.com/#organization',
                name: 'OMENORA',
                legalName: 'United Northwest Carriers Inc.',
                alternateName: 'UNC Development',
                url: 'https://omenora.com',
                description: 'AI-powered personality and astrology readings. Discover your archetype, life path number, and 2026 forecast through real natal chart calculations across 6 ancient wisdom traditions.',
                slogan: 'AI decoded your destiny. Science explains why.',
                logo: {
                  '@type': 'ImageObject',
                  '@id': 'https://omenora.com/#logo',
                  url: 'https://omenora.com/og-image.png',
                  width: 1200,
                  height: 630,
                  caption: 'OMENORA',
                },
                image: { '@id': 'https://omenora.com/#logo' },
                foundingDate: '2025',
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'customer support',
                  email: 'support@omenora.com',
                  areaServed: 'Worldwide',
                  availableLanguage: ['English'],
                },
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: 'Addison',
                  addressRegion: 'IL',
                  addressCountry: 'US',
                },
                knowsAbout: [
                  'Astrology',
                  'Numerology',
                  'Birth Charts',
                  'Life Path Numbers',
                  'Zodiac Compatibility',
                  'Horoscopes',
                  'Destiny Analysis',
                ],
                sameAs: [
                  'https://www.tiktok.com/@omenora.com',
                  'https://www.instagram.com/omenoraofficial',
                  'https://www.facebook.com/profile.php?id=61572569892395',
                  // 'https://twitter.com/omenora',
                  // 'https://www.youtube.com/@omenora',
                  // 'https://www.linkedin.com/company/omenora',
                  // 'https://www.pinterest.com/omenora',
                ],
              },
            ],
          }),
        },
      ],
    },
  },
})
