// Build-time resume PDF. Serves the generated site, prints /cv (in its
// light, print-optimized form) to a static PDF in the output. Non-fatal: if
// the browser isn't available it warns and exits 0 so it never breaks a build.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../.output/public', import.meta.url))
const outFile = join(root, 'laurens-verspeek-resume.pdf')
const port = 4199

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
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
  let file = await tryFile(join(root, url))
  if (!file && !extname(url)) file = await tryFile(join(root, url, 'index.html'))
  if (!file) file = join(root, '200.html')
  try {
    const body = await readFile(file)
    res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream')
    res.end(body)
  } catch {
    res.statusCode = 404
    res.end('not found')
  }
})

const main = async () => {
  const { chromium } = await import('playwright-core')
  await new Promise((resolve) => server.listen(port, resolve))

  const browser = await chromium.launch()
  const page = await browser.newPage()
  // force the light, print-optimized theme and skip the boot splash animation
  await page.addInitScript(() => {
    try {
      localStorage.setItem('nuxt-color-mode', 'light')
      sessionStorage.setItem('lv-booted', '1')
    } catch { /* ignore */ }
  })
  await page.emulateMedia({ media: 'print', colorScheme: 'light' })
  await page.goto(`http://localhost:${port}/cv`, { waitUntil: 'load' })
  await page.locator('.cv-sheet').waitFor({ timeout: 10_000 })
  await page.waitForTimeout(500) // let fonts + layout settle
  await page.pdf({
    path: outFile,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' }
  })
  await browser.close()
  console.log('[resume] wrote laurens-verspeek-resume.pdf')
}

try {
  await main()
} catch (error) {
  console.warn('[resume] skipped PDF generation:', error?.message ?? error)
} finally {
  server.close()
}
