import { projects } from '../../app/data/projects'

const SITE = 'https://laurensverspeek.nl'

export default defineEventHandler((event) => {
  const pages = [
    '/', '/projects', '/blog', '/about', '/uses', '/now', '/cv', '/contact',
    // interactive extras
    '/life', '/desktop', '/changelog'
  ]
  const posts = [
    // Keep in sync with content/blog/*.md
    '/blog/rebuilding-this-site',
    '/blog/snake-in-the-terminal',
    '/blog/a-window-manager-in-a-div',
    '/blog/an-os-on-its-own-route',
    '/blog/game-of-life-everywhere'
  ]
  const urls = [...pages, ...projects.map((p) => `/projects/${p.slug}`), ...posts]

  // a single build-time lastmod is honest for a statically generated site
  const lastmod = new Date().toISOString().slice(0, 10)

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${SITE}${url}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml')
  return body
})
