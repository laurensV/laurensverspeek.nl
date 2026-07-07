import { queryCollection } from '@nuxt/content/server'

const SITE = 'https://laurensverspeek.nl'

export default defineEventHandler(async (event) => {
  const posts = await queryCollection(event, 'blog').order('date', 'DESC').all()

  const items = posts
    .map(
      (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE}${post.path}</link>
      <guid>${SITE}${post.path}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.description}]]></description>
    </item>`
    )
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>laurensverspeek.nl — blog</title>
    <link>${SITE}/blog</link>
    <description>Occasional writing about code, blockchain and this website.</description>
    <language>en</language>
${items}
  </channel>
</rss>`

  setHeader(event, 'content-type', 'application/xml')
  return body
})
