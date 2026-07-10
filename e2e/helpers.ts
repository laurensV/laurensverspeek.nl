import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Shared drivers for the e2e specs — the terminal and lvOS both open the same
// way, so keep the choreography in one place.

/** Press ` until the terminal opens. The page paints before hydration attaches
 * the key listener, so a single early press can silently vanish. */
export const pressTerminalKey = async (page: Page) => {
  await expect(async () => {
    await page.keyboard.press('`')
    await page.locator('#terminal-input').waitFor({ timeout: 1000 })
  }).toPass({ timeout: 15000 })
}

/** Open the interactive terminal the way a keyboard user would: `~`, then type. */
export const openTerminal = async (page: Page) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await pressTerminalKey(page)
}

/** Type a command into the open terminal and submit it. */
export const run = async (page: Page, command: string) => {
  await page.fill('#terminal-input', command)
  await page.keyboard.press('Enter')
}

/** Boot lvOS from the terminal and wait for the desktop to appear. */
export const bootDesktop = async (page: Page) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await pressTerminalKey(page)
  await page.fill('#terminal-input', 'desktop')
  await page.keyboard.press('Enter')
  // the BIOS boot screen flashes past (or is skipped under reduced motion),
  // so the desktop itself is the only reliable signal
  await page.locator('.lvos').waitFor({ timeout: 16000 })
}
