import { queryCollection } from '@nuxt/content/server'
import { minimarkToHtml } from '../../app/utils/minimarkHtml'

const SITE = 'https://laurensverspeek.nl'

// CDATA may not contain its own terminator
const cdata = (text: string) => `<![CDATA[${text.replaceAll(']]>', ']]&gt;')}]]>`

export default defineEventHandler(async (event) => {
  const posts = await queryCollection(event, 'blog').order('date', 'DESC').all()

  const items = posts
    .map(
      (post) => `    <item>
      <title>${cdata(post.title)}</title>
      <link>${SITE}${post.path}</link>
      <guid>${SITE}${post.path}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${cdata(post.description)}</description>
      <content:encoded>${cdata(minimarkToHtml(post.body, SITE))}</content:encoded>
    </item>`
    )
    .join('\n')

  // newest post's date — a feed validator wants a lastBuildDate on the channel
  const lastBuild = posts[0] ? new Date(posts[0].date).toUTCString() : new Date(0).toUTCString()

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>laurensverspeek.nl — blog</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Occasional writing about code, blockchain and this website.</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>`

  setHeader(event, 'content-type', 'application/xml')
  return body
})
