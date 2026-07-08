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

test('mobile menu stays reachable while open (scroll is locked)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/')
  await page.locator('.nav-toggle').click()
  await expect(page.locator('.mobile-menu')).toBeVisible()
  // the document is frozen while the menu is open
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')
  // trying to scroll the page behind must not drag the [close] button away
  await page.mouse.wheel(0, 800)
  const toggle = page.locator('.nav-toggle')
  await expect(toggle).toBeInViewport()
  await expect(toggle).toHaveText('[close]')
  // and it still closes, restoring normal scrolling
  await toggle.click()
  await expect(page.locator('.mobile-menu')).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed')
})

test('Escape closes the mobile menu and restores focus to the toggle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/')
  await page.locator('.nav-toggle').click()
  const menu = page.locator('.mobile-menu')
  await expect(menu).toBeVisible()
  await expect(menu).toHaveAttribute('role', 'dialog')
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(page.locator('.nav-toggle')).toBeFocused()
})

test('scroll-progress rail fills as the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 500 })
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const fill = page.locator('.scroll-rail-fill')
  const scaleAt = async () =>
    fill.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a)
  expect(await scaleAt()).toBeCloseTo(0, 1)
  await page.mouse.wheel(0, 1200)
  await expect.poll(scaleAt).toBeGreaterThan(0)
})

test('mobile menu search opens the palette', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/')
  await page.locator('.nav-toggle').click()
  await page.locator('.mobile-search').click()
  await expect(page.locator('.palette-window')).toBeVisible()
})

test('status bar easter eggs cycle presence, line endings and language', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const online = page.locator('.status-online')
  await expect(online).toContainText('online')
  await online.click()
  await expect(online).toContainText('away')

  const eol = page.locator('.status-eol')
  await expect(eol).toHaveText('LF')
  await eol.click()
  await expect(eol).toHaveText('CRLF')

  const lang = page.locator('.status-lang')
  await expect(lang).toHaveText('Vue')
  await lang.click()
  await expect(lang).toHaveText('TypeScript')
})

test('footer text links use the dotted style; see-all links have an arrow', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  // see-all link on the home page carries its animated arrow
  await expect(page.locator('.see-all .see-all-arrow').first()).toBeVisible()
  // footer text link gets the dotted underline (icon social links do not)
  const footerLink = page.locator('.app-footer .terminal-hint a').first()
  await footerLink.scrollIntoViewIfNeeded()
  const styles = await footerLink.evaluate((el) => ({
    line: getComputedStyle(el).textDecorationLine,
    dot: getComputedStyle(el, '::after').borderBottomStyle
  }))
  expect(styles.line).toBe('none')
  expect(styles.dot).toBe('dotted')
  const social = await page.locator('.app-footer .social-link').first().evaluate(
    (el) => getComputedStyle(el, '::after').borderBottomStyle
  )
  expect(social).not.toBe('dotted')
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

test('/desktop route boots straight into lvOS', async ({ page }) => {
  await page.goto('/desktop')
  // boots through the BIOS screen into the desktop
  await expect(page.locator('.lvos')).toBeVisible({ timeout: 10000 })
  // the route locks page scroll so no dead scrollbar sits behind the desktop
  await expect(page.locator('html')).toHaveClass(/is-lvos/)
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
