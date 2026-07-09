import type { Page } from '@playwright/test'

// Shared drivers for the e2e specs — the terminal and lvOS both open the same
// way, so keep the choreography in one place.

/** Open the interactive terminal the way a keyboard user would: `~`, then type. */
export const openTerminal = async (page: Page) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('`')
  await page.locator('#terminal-input').waitFor()
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
  await page.keyboard.press('`')
  await page.fill('#terminal-input', 'desktop')
  await page.keyboard.press('Enter')
  // BIOS boot screen, then the desktop
  await page.locator('.boot').waitFor({ timeout: 8000 })
  await page.locator('.lvos').waitFor({ timeout: 8000 })
}
