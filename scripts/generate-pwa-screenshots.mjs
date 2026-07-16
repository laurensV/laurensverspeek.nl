// Build-time PWA install-sheet screenshots. The manifest's `screenshots`
// entries make Chrome/Android show the rich bottom-sheet install UI with
// previews instead of the bare mini prompt. Captures one wide (desktop, the
// lvOS desktop) and one narrow (phone, the home page) PNG into the output.
// Runs as a scripts/postgenerate.mjs step (one shared browser + server boot).

import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// also refresh the committed-adjacent copies in public/ (gitignored) so
// `npm run dev` serves the manifest's screenshot URLs too
const publicDir = fileURLToPath(new URL('../public', import.meta.url))

// keep in sync with pwa.manifest.screenshots in nuxt.config.ts: the `sizes`
// there must match these viewports (narrow is 375x812 at DPR 2 → 750x1624)
const SHOTS = [
  { name: 'pwa-screenshot-wide.png', path: '/desktop', waitFor: '.lvos', width: 1280, height: 720, scale: 1, mobile: false },
  { name: 'pwa-screenshot-narrow.png', path: '/', waitFor: '.hero-name', width: 375, height: 812, scale: 2, mobile: true }
]

/** @param {{ browser: import('@playwright/test').Browser, port: number, root: string }} ctx */
export const capturePwaScreenshots = async ({ browser, port, root }) => {
  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: shot.scale,
      isMobile: shot.mobile,
      hasTouch: shot.mobile,
      colorScheme: 'dark'
    })
    const page = await context.newPage()
    // the dark theme is the site's signature look; skip the boot splash
    await page.addInitScript(() => {
      try {
        localStorage.setItem('nuxt-color-mode', 'dark')
        sessionStorage.setItem('lv-booted', '1')
      } catch { /* ignore */ }
    })
    await page.goto(`http://localhost:${port}${shot.path}`, { waitUntil: 'load' })
    await page.locator(shot.waitFor).first().waitFor({ timeout: 15_000 })
    await page.waitForTimeout(1200) // fonts, reveals and lvOS boot settle
    const outFile = join(root, shot.name)
    await page.screenshot({ path: outFile })
    await context.close()
    await copyFile(outFile, join(publicDir, shot.name))
    console.log(`[pwa-shots] wrote ${shot.name}`)
  }
}
