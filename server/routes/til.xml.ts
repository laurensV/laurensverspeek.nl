import { queryCollection } from '@nuxt/content/server'
import { minimarkToHtml } from '../../app/utils/minimarkHtml'

const SITE = 'https://laurensverspeek.nl'

// CDATA may not contain its own terminator
const cdata = (text: string) => `<![CDATA[${text.replaceAll(']]>', ']]&gt;')}]]>`

export default defineEventHandler(async (event) => {
  const entries = await queryCollection(event, 'til').order('date', 'DESC').all()

  const anchor = (id: string) => id.split('/').pop()?.replace(/\.md$/, '') ?? id
  const items = entries
    .map(
      (entry) => `    <item>
      <title>${cdata(entry.title)}</title>
      <link>${SITE}/til#${anchor(entry.id)}</link>
      <guid>${SITE}/til#${anchor(entry.id)}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <content:encoded>${cdata(minimarkToHtml(entry.body, SITE))}</content:encoded>
    </item>`
    )
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>laurensverspeek.nl — TIL</title>
    <link>${SITE}/til</link>
    <description>Today I Learned: short notes on things worth remembering.</description>
    <language>en</language>
${items}
  </channel>
</rss>`

  setHeader(event, 'content-type', 'application/xml')
  return body
})
