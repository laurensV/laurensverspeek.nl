import { execSync } from 'node:child_process'
import { projects } from '../../app/data/projects'

const SITE = 'https://laurensverspeek.nl'

// prerendered at generate time, so we can ask git when each page's sources
// last really changed instead of stamping everything with the build date
const buildDate = new Date().toISOString().slice(0, 10)
const gitDate = (...files: string[]): string => {
  try {
    return (
      execSync(`git log -1 --format=%as -- ${files.join(' ')}`, { encoding: 'utf8' }).trim()
      || buildDate
    )
  } catch {
    return buildDate
  }
}

// which source files make a page "change"
const PAGE_SOURCES: Record<string, string[]> = {
  '/': ['app/pages/index.vue', 'app/data/profile.ts'],
  '/projects': ['app/pages/projects/index.vue', 'app/data/projects.ts'],
  '/blog': ['app/pages/blog/index.vue', 'content/blog'],
  '/about': ['app/pages/about.vue', 'app/data/profile.ts'],
  '/uses': ['app/pages/uses.vue', 'app/data/uses.ts'],
  '/now': ['app/pages/now.vue', 'app/data/now.ts'],
  '/cv': ['app/pages/cv.vue', 'app/data/profile.ts'],
  '/contact': ['app/pages/contact.vue'],
  '/life': ['app/pages/life.vue'],
  '/desktop': ['app/pages/desktop.vue'],
  '/changelog': ['app/pages/changelog.vue']
}

const POSTS = [
  // Keep in sync with content/blog/*.md
  'rebuilding-this-site',
  'snake-in-the-terminal',
  'a-window-manager-in-a-div',
  'an-os-on-its-own-route',
  'game-of-life-everywhere'
]

export default defineEventHandler((event) => {
  const urls: { loc: string, lastmod: string }[] = [
    ...Object.entries(PAGE_SOURCES).map(([path, sources]) => ({
      loc: path,
      lastmod: gitDate(...sources)
    })),
    ...projects.map((p) => ({
      loc: `/projects/${p.slug}`,
      lastmod: gitDate('app/data/projects.ts', 'app/pages/projects/[slug].vue')
    })),
    ...POSTS.map((slug) => ({
      loc: `/blog/${slug}`,
      lastmod: gitDate(`content/blog/${slug}.md`)
    }))
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${SITE}${url.loc}</loc><lastmod>${url.lastmod}</lastmod></url>`).join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml')
  return body
})
