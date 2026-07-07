import { projects } from '../../app/data/projects'

const SITE = 'https://laurensverspeek.nl'

export default defineEventHandler((event) => {
  const pages = ['/', '/projects', '/blog', '/about', '/uses', '/now', '/cv', '/contact']
  const urls = [
    ...pages,
    ...projects.map((p) => `/projects/${p.slug}`),
    // Keep in sync with content/blog/*.md
    '/blog/rebuilding-this-site',
    '/blog/snake-in-the-terminal'
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${SITE}${url}</loc></url>`).join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml')
  return body
})
