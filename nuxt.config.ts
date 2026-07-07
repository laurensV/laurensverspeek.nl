export default defineNuxtConfig({
  compatibilityDate: '2026-07-07',

  experimental: {
    // native View Transitions API for route changes (falls back to pageTransition)
    viewTransition: true
  },

  modules: ['@nuxt/content', '@nuxt/eslint', '@nuxtjs/color-mode', '@vite-pwa/nuxt', '@vueuse/nuxt'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Laurens Verspeek',
      short_name: 'lv',
      description: 'Portfolio of Laurens Verspeek — full-stack developer & blockchain engineer.',
      theme_color: '#101014',
      background_color: '#101014',
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: {
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,png,svg,ico,txt,xml}'],
      // static site: cache pages as visited, serve from cache when offline
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: { cacheName: 'pages' }
        }
      ]
    }
  },

  content: {
    build: {
      markdown: {
        highlight: {
          themes: ['github-light', 'github-dark'],
          theme: {
            default: 'github-light',
            dark: 'github-dark'
          },
          langs: ['ts', 'vue', 'bash', 'scss', 'json']
        }
      }
    }
  },

  css: ['~/assets/scss/global.scss'],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // Bulma 1.x still uses a few deprecated Sass features internally
          quietDeps: true,
          silenceDeprecations: ['import', 'global-builtin']
        }
      }
    }
  },

  nitro: {
    prerender: {
      routes: ['/sitemap.xml', '/rss.xml']
    }
  },

  colorMode: {
    preference: 'system',
    fallback: 'dark',
    // Bulma v1 themes are driven by the `data-theme` attribute on <html>
    dataValue: 'theme',
    classSuffix: ''
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'Laurens Verspeek',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Laurens Verspeek — full-stack developer & blockchain engineer. Co-founder of Nosana and Effect.AI.'
        },
        { name: 'theme-color', content: '#ffba00' },
        { property: 'og:title', content: 'Laurens Verspeek' },
        {
          property: 'og:description',
          content:
            'Full-stack developer & blockchain engineer. Co-founder of Nosana and Effect.AI.'
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://laurensverspeek.nl' },
        { property: 'og:image', content: 'https://laurensverspeek.nl/og.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Laurens Verspeek' },
        { name: 'twitter:image', content: 'https://laurensverspeek.nl/og.png' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300..900&family=JetBrains+Mono:wght@400;600;700&display=swap'
        }
      ]
    }
  }
})
