import { test, expect } from '@playwright/test'

test('navbar gains a divider once scrolled', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await expect(page.locator('.app-navbar')).not.toHaveClass(/is-scrolled/)
  await page.mouse.wheel(0, 400)
  await expect(page.locator('.app-navbar')).toHaveClass(/is-scrolled/)
})

test('navbar search button opens the command palette', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.locator('.nav-search').click()
  await expect(page.locator('.palette-window')).toBeVisible()
})

test('full-screen mobile menu opens and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/')
  await page.locator('.nav-toggle').click()
  await expect(page.locator('.mobile-menu')).toBeVisible()
  await page.locator('.mobile-link', { hasText: 'projects' }).click()
  await expect(page).toHaveURL(/\/projects/)
})

test('mobile menu search opens the palette', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/')
  await page.locator('.nav-toggle').click()
  await page.locator('.mobile-search').click()
  await expect(page.locator('.palette-window')).toBeVisible()
})

test('? opens the shortcuts cheatsheet', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('?')
  await expect(page.locator('.shortcuts-window')).toBeVisible()
  await expect(page.locator('.shortcuts-window')).toContainText('command palette')
  await page.keyboard.press('Escape')
  await expect(page.locator('.shortcuts-window')).toHaveCount(0)
})

test('?desktop URL boots straight into lvOS', async ({ page }) => {
  await page.goto('/?desktop')
  await page.locator('.hero-name').waitFor()
  // boots through the BIOS screen into the desktop
  await expect(page.locator('.lvos')).toBeVisible({ timeout: 10000 })
})

test('footer link boots the desktop', async ({ page }) => {
  await page.goto('/')
  await page.locator('.app-footer').scrollIntoViewIfNeeded()
  await page.locator('.app-footer a', { hasText: 'boot lvOS' }).click()
  await expect(page.locator('.lvos, .boot')).toBeVisible({ timeout: 10000 })
})

test('resume PDF is generated and downloadable', async ({ request }) => {
  const res = await request.get('/laurens-verspeek-resume.pdf')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('pdf')
})
