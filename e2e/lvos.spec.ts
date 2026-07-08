import { test, expect, type Page } from '@playwright/test'

const bootDesktop = async (page: Page) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('`')
  await page.fill('#terminal-input', 'desktop')
  await page.keyboard.press('Enter')
  // BIOS boot screen, then the desktop
  await page.locator('.boot').waitFor({ timeout: 8000 })
  await page.locator('.lvos').waitFor({ timeout: 8000 })
}

test('boots through the BIOS screen into the desktop', async ({ page }) => {
  await bootDesktop(page)
  await expect(page.locator('.lvos-taskbar')).toContainText('lvOS')
})

test('opens the calculator and evaluates an expression', async ({ page }) => {
  await bootDesktop(page)
  // move the readme window off the icon column first
  const bar = page.locator('.lvos-window-titlebar').first()
  const box = await bar.boundingBox()
  if (box) {
    await page.mouse.move(box.x + 60, box.y + 10)
    await page.mouse.down()
    await page.mouse.move(820, 460, { steps: 6 })
    await page.mouse.up()
  }
  await page.locator('.lvos-icon', { hasText: 'calculator' }).click()
  await page.locator('.calc').waitFor()
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const key of ['6', '*', '7', '=']) {
    await page.locator('.calc-key').filter({ hasText: new RegExp(`^${escapeRe(key)}$`) }).click()
  }
  await expect(page.locator('.calc-expr')).toHaveText('42')
})

test('maximizes and restores a window', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Maximize"]').first().click()
  await expect(page.locator('.lvos-window.is-maximized')).toHaveCount(1)
  await page.locator('.lvos-window-actions button[title="Restore"]').first().click()
  await expect(page.locator('.lvos-window.is-maximized')).toHaveCount(0)
})

test('shows a right-click context menu on the desktop', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos').click({ button: 'right', position: { x: 600, y: 400 } })
  await expect(page.locator('.lvos-context')).toBeVisible()
  await expect(page.locator('.lvos-context')).toContainText('new terminal')
})

test('runs the terminal as a real desktop window', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-icon', { hasText: /^terminal$/ }).first().click()
  await page.locator('.lvos-window .desktop-terminal').waitFor()
  await expect(page.locator('.lvos-window-title', { hasText: 'lvsh' })).toBeVisible()
  await page.fill('#desktop-terminal-input', 'whoami')
  await page.keyboard.press('Enter')
  await expect(page.locator('.desktop-terminal')).toContainText('visitor')
})
