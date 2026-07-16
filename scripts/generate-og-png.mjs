// Rasterize the branded OG cards to PNG. Social platforms (X, LinkedIn, Slack,
// Discord, Facebook) refuse SVG for og:image/twitter:image, so every share
// link would otherwise show no preview card. Runs as a scripts/postgenerate.mjs
// step after `nuxt generate` (one shared browser boot), rendering each
// generated SVG in headless chromium (with the real webfonts) and
// screenshotting it to a same-named .png alongside.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ogDir = fileURLToPath(new URL('../.output/public/og', import.meta.url))

const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@300..900&family=JetBrains+Mono:wght@400;600;700&display=swap'

/** @param {{ browser: import('@playwright/test').Browser }} ctx */
export const rasterizeOgCards = async ({ browser }) => {
  let svgs
  try {
    svgs = readdirSync(ogDir).filter((file) => file.endsWith('.svg'))
  } catch {
    console.warn('[og-png] no og/ directory in the build output — skipping')
    return
  }
  if (!svgs.length) {
    console.warn('[og-png] no SVG cards found — skipping')
    return
  }

  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

  let count = 0
  for (const svg of svgs) {
    const markup = readFileSync(join(ogDir, svg), 'utf8')
    // inline the SVG in a page that loads the site's webfonts, so the text
    // rasterizes in Inter / JetBrains Mono rather than a fallback
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8">`
      + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
      + `<link href="${FONTS}" rel="stylesheet"></head>`
      + `<body style="margin:0">${markup}</body></html>`,
      { waitUntil: 'networkidle' }
    )
    await page.evaluate(() => document.fonts.ready)
    const el = await page.$('svg')
    if (!el) continue
    await el.screenshot({ path: join(ogDir, svg.replace(/\.svg$/, '.png')) })
    count++
  }

  await page.close()
  console.log(`[og-png] rasterized ${count} OG card${count === 1 ? '' : 's'} to PNG`)
}
