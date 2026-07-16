// Build-time resume PDF. Prints /cv in its light, print-optimized form to a
// static PDF in the output. Runs as a scripts/postgenerate.mjs step (one
// shared browser + static server boot); `npm run resume` invokes that
// orchestrator with --only=resume.

import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// also refresh the committed copy in public/ so `npm run dev` serves it too
const sourceCopy = fileURLToPath(new URL('../public/laurens-verspeek-resume.pdf', import.meta.url))

/** @param {{ browser: import('@playwright/test').Browser, port: number, root: string }} ctx */
export const generateResume = async ({ browser, port, root }) => {
  const outFile = join(root, 'laurens-verspeek-resume.pdf')
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
  await page.close()
  await copyFile(outFile, sourceCopy)
  console.log('[resume] wrote laurens-verspeek-resume.pdf')
}
