// One browser, one server, all build-time captures. The OG rasterizer, resume
// PDF and PWA screenshots each used to boot their own chromium (and two their
// own static server) back to back — this runs them as steps over a single
// boot. Non-fatal like its parts: a missing browser or a failing step warns
// and never breaks `generate`. `--only=<step>` runs one step standalone
// (npm run resume uses it).

import { fileURLToPath } from 'node:url'
import { createStaticServer } from './static-server.mjs'
import { rasterizeOgCards } from './generate-og-png.mjs'
import { generateResume } from './generate-resume.mjs'
import { capturePwaScreenshots } from './generate-pwa-screenshots.mjs'

const root = fileURLToPath(new URL('../.output/public', import.meta.url))
const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length)

/** @type {[string, (ctx: { browser: import('@playwright/test').Browser, port: number, root: string }) => Promise<void>][]} */
const steps = [
  ['og-png', rasterizeOgCards],
  ['resume', generateResume],
  ['pwa-shots', capturePwaScreenshots]
]
const wanted = steps.filter(([name]) => !only || name === only)

const server = createStaticServer(root)
/** @type {import('@playwright/test').Browser | undefined} */
let browser

try {
  const { chromium } = await import('@playwright/test')
  const port = await new Promise((resolve, reject) => {
    server.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') reject(new Error('server has no port'))
      else resolve(address.port)
    })
  })
  browser = await chromium.launch()
  for (const [name, step] of wanted) {
    try {
      await step({ browser, port, root })
    } catch (/** @type {any} */ error) {
      console.warn(`[${name}] skipped:`, error?.message ?? error)
    }
  }
} catch (/** @type {any} */ error) {
  // never break the build over preview assets
  console.warn('[postgenerate] skipped browser captures:', error?.message ?? error)
} finally {
  await browser?.close().catch(() => undefined)
  server.close()
}
