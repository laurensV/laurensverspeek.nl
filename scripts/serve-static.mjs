// Minimal static server for the generated site, used by the E2E suite.
// Serves .output/public with a SPA fallback so unknown routes (e.g. a 404 URL)
// load the app shell and Nuxt renders error.vue client-side.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../.output/public', import.meta.url))
const port = Number(process.env.PORT ?? 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.vcf': 'text/vcard; charset=utf-8',
  '.woff2': 'font/woff2'
}

const tryFile = async (path) => {
  try {
    const s = await stat(path)
    if (s.isFile()) return path
    if (s.isDirectory()) return tryFile(join(path, 'index.html'))
  } catch { /* not found */ }
  return null
}

const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  const candidate = join(root, url)

  // resolve the file, or fall back through index.html → 200.html SPA shell
  let file = await tryFile(candidate)
  if (!file && !extname(url)) file = await tryFile(join(candidate, 'index.html'))
  const isFallback = !file
  if (!file) file = join(root, '200.html')

  try {
    const body = await readFile(file)
    res.statusCode = isFallback ? 200 : 200
    res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream')
    res.end(body)
  } catch {
    res.statusCode = 404
    res.end('not found')
  }
})

server.listen(port, () => console.log(`static server on http://localhost:${port}`))
