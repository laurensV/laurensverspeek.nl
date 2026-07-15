import { execSync } from 'node:child_process'
import { pgp } from './app/data/pgp'

// baked into the footer's build stamp; the hash links into the terminal's git command
const buildHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
})()

// the site version, shown in the status bar, terminal banner and BIOS splash.
// CI sets SITE_VERSION to the release tag it's about to cut (the latest GitHub
// Release, patch-bumped); locally we fall back to the newest git tag, then to
// package.json — so dev and PR builds still show a sensible version.
const buildVersion = (() => {
  if (process.env.SITE_VERSION) return process.env.SITE_VERSION
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim()
  } catch {
    return `v${process.env.npm_package_version ?? '2.0.0'}`
  }
})()

// when a file last really changed, per git — a post's "last updated" is honest
const gitFileDate = (file: string) => {
  try {
    return execSync(`git log -1 --format=%as -- ${file}`, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

// slug → last-git-modified date for every blog post, baked in so a post can
// show an honest "updated" line (and dateModified) when it changed after publish
const postUpdated: Record<string, string> = (() => {
  try {
    const files = execSync('git ls-files content/blog/*.md', { encoding: 'utf8' }).trim().split('\n')
    const map: Record<string, string> = {}
    for (const file of files.filter(Boolean)) {
      const slug = file.replace(/^content\/blog\//, '').replace(/\.md$/, '')
      map[slug] = gitFileDate(file)
    }
    return map
  } catch {
    return {}
  }
})()

export default defineNuxtConfig({
  compatibilityDate: '2026-07-07',

  experimental: {
    // native View Transitions API for route changes (falls back to pageTransition)
    viewTransition: true
  },

  modules: ['@nuxt/content', '@nuxt/eslint', '@nuxtjs/color-mode', '@vite-pwa/nuxt', '@vueuse/nuxt'],

  eslint: {
    config: {
      // strict rules are on by default; the tsconfig path upgrades them to
      // the type-checked tier (typescript-eslint strict-type-checked)
      typescript: { strict: true, tsconfigPath: './tsconfig.json' }
    }
  },

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
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        // full-bleed variant so Android adaptive icons mask cleanly (the glyph
        // sits inside the maskable safe zone, background bleeds to every edge)
        { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ],
      // long-press / right-click shortcuts on the installed app icon
      shortcuts: [
        { name: 'Blog', short_name: 'Blog', url: '/blog', description: 'Read the latest posts' },
        { name: 'lvOS desktop', short_name: 'lvOS', url: '/desktop', description: 'Boot the desktop environment' },
        { name: 'Changelog', short_name: 'Changelog', url: '/changelog', description: "What's changed on the site" }
      ]
    },
    workbox: {
      navigateFallback: null,
      // include wasm so Nuxt Content's SQLite engine (_nuxt/sqlite3*.wasm) is
      // precached — without it a cold offline launch can't run client-side
      // content queries (palette blog search, terminal `blog`, latest-posts)
      globPatterns: ['**/*.{js,css,html,png,svg,ico,txt,xml,wasm}'],
      // lvOS Time Machine: loaded first inside the generated SW so its fetch
      // listener runs before Workbox's. Dormant unless you're time-travelling,
      // when it serves past builds of the site from jsDelivr (public/sw-timemachine.js).
      importScripts: ['/sw-timemachine.js'],
      // static site: cache pages as visited, serve from cache when offline —
      // and when neither network nor cache has it, fall back to /offline.html
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            // cap the runtime cache so it can't grow unbounded (one entry per
            // navigated URL, query strings included) — the whole site is
            // precached anyway, this is just a ceiling on the runtime layer
            expiration: { maxEntries: 50 },
            // the manifest strips .html, so the precache key is extensionless
            precacheFallback: { fallbackURL: '/offline' }
          }
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

  typescript: {
    tsConfig: {
      compilerOptions: {
        // indexing into arrays/records yields T | undefined — catches real
        // out-of-bounds bugs in the games/VFS code
        noUncheckedIndexedAccess: true,
        // missing and explicitly-undefined properties are different things
        exactOptionalPropertyTypes: true
      },
      // type-check prop/event bindings inside templates too
      vueCompilerOptions: {
        strictTemplates: true,
        // data-* attributes are not typos, they're hooks for e2e and CSS
        dataAttributes: ['data-*']
      }
    }
  },

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

  runtimeConfig: {
    public: {
      // set NUXT_PUBLIC_GOATCOUNTER to enable privacy-first analytics
      goatcounter: '',
      // set NUXT_PUBLIC_CURSORS_WS (wss://...) to enable live visitor cursors
      cursorsWs: '',
      buildHash,
      buildVersion,
      buildDate: new Date().toISOString().slice(0, 10),
      postUpdated
    }
  },

  nitro: {
    prerender: {
      // /desktop is client-only (lvOS), but prerender the shell so a direct hit
      // to the shareable URL gets a real file instead of only the SPA fallback
      routes: ['/sitemap.xml', '/rss.xml', '/git-log.json', '/time-machine.json', '/contact.vcf', '/resume.json', '/desktop', '/life', '/keyboard', '/status', ...(pgp.publicKey ? ['/pgp.txt'] : [])]
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
        { property: 'og:image', content: 'https://laurensverspeek.nl/og/default.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Laurens Verspeek' },
        { name: 'twitter:image', content: 'https://laurensverspeek.nl/og/default.png' }
      ],
      link: [
        // SVG favicon (the >_ mark) for modern browsers; .ico as the fallback
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // let feed readers and browsers discover the RSS feed automatically
        { rel: 'alternate', type: 'application/rss+xml', title: 'laurensverspeek.nl — blog', href: '/rss.xml' },
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
