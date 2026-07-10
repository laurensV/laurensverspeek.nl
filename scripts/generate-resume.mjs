// Build-time resume PDF. Serves the generated site (via the shared static
// server), prints /cv in its light, print-optimized form to a static PDF in
// the output. Non-fatal: if the browser isn't available it warns and exits 0
// so it never breaks a build.

import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStaticServer } from './static-server.mjs'

const root = fileURLToPath(new URL('../.output/public', import.meta.url))
const outFile = join(root, 'laurens-verspeek-resume.pdf')
// also refresh the committed copy in public/ so `npm run dev` serves it too
const sourceCopy = fileURLToPath(new URL('../public/laurens-verspeek-resume.pdf', import.meta.url))

const server = createStaticServer(root)

const main = async () => {
  const { chromium } = await import('@playwright/test')
  // an ephemeral port: a fixed one once collided with a parked dev server
  await new Promise((resolve) => server.listen(0, () => resolve(undefined)))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('server has no port')
  const port = address.port

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
  await copyFile(outFile, sourceCopy)
  console.log('[resume] wrote laurens-verspeek-resume.pdf')
}

try {
  await main()
} catch (/** @type {any} */ error) {
  console.warn('[resume] skipped PDF generation:', error?.message ?? error)
} finally {
  server.close()
}
