const SITE = 'https://laurensverspeek.nl'

export default defineEventHandler((event) => {
  const urls = ['/', '/projects', '/about', '/contact']

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${SITE}${url}</loc></url>`).join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml')
  return body
})
