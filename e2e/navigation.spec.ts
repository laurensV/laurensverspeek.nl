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

test('navbar shows the >_ brand mark and links the svg favicon', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await expect(page.locator('.nav-brand .brand-mark svg')).toBeAttached()
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/favicon.svg')
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
  await page.locator('.hero-name').waitFor()
  // the boot splash covers the page briefly; let it clear before clicking
  await page.locator('.boot-splash').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
  const bootLink = page.locator('.app-footer a', { hasText: 'boot lvOS' })
  await bootLink.waitFor()
  // the footer sits behind the fixed status bar and shifts while stats load, so
  // dispatch the click directly on the link — it still fires its @click handler
  await bootLink.evaluate((el) => (el as HTMLElement).click())
  await expect(page.locator('.lvos, .boot')).toBeVisible({ timeout: 10000 })
})

test('resume PDF is generated and downloadable', async ({ request }) => {
  const res = await request.get('/laurens-verspeek-resume.pdf')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('pdf')
})

test('vim keys scroll the page: j, G and gg', async ({ page }) => {
  await page.goto('/about')
  await page.locator('h1').waitFor()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.keyboard.press('j')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  // G jumps (well) past a single j-step, gg returns to the very top
  await page.keyboard.press('Shift+G')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
  await page.keyboard.press('g')
  await page.keyboard.press('g')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

test('vim scrolling stays instant under reduced motion and quiet in inputs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // short viewport so the contact page is guaranteed to be scrollable
  await page.setViewportSize({ width: 900, height: 480 })
  await page.goto('/contact')
  await page.locator('h1').waitFor()
  // typing j into the contact wizard input must NOT scroll the page
  const input = page.locator('input').first()
  await input.click()
  await input.press('j')
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  // pressing j outside the input scrolls immediately (auto behavior)
  await page.locator('h1').click()
  await page.keyboard.press('j')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

test('subpages show a pwd-style breadcrumb with clickable parents', async ({ page }) => {
  await page.goto('/blog/snake-in-the-terminal')
  const crumbs = page.locator('.crumbs')
  await expect(crumbs).toBeVisible()
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText('snake-in-the-terminal')
  await crumbs.locator('.crumbs-link', { hasText: 'blog' }).click()
  await expect(page).toHaveURL(/\/blog\/?$/)
  // the home page keeps no trail
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await expect(page.locator('.crumbs')).toHaveCount(0)
  // /life opts out: the strip would shrink its full-viewport board
  await page.goto('/life')
  await expect(page.locator('.life-canvas')).toBeVisible()
  await expect(page.locator('.crumbs')).toHaveCount(0)
})

test('footer build stamp opens git show in the terminal', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.locator('.boot-splash').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
  const stamp = page.locator('.build-stamp')
  await stamp.scrollIntoViewIfNeeded()
  await expect(stamp).toContainText(/built \d{4}-\d{2}-\d{2}/)
  const hash = page.locator('.build-hash')
  await expect(hash).toHaveText(/^[0-9a-f]{7,}$/)
  // clicking the hash opens the terminal on that commit
  await hash.evaluate((el) => (el as HTMLElement).click())
  await expect(page.locator('.terminal-window')).toBeVisible()
  await expect(page.locator('.terminal-output')).toContainText('commit')
})

test('vim go-to chords navigate: gb to blog, gh home', async ({ page }) => {
  await page.goto('/about')
  await page.locator('h1').waitFor()
  await page.keyboard.press('g')
  await page.keyboard.press('b')
  await expect(page).toHaveURL(/\/blog\/?$/)
  await page.keyboard.press('g')
  await page.keyboard.press('h')
  await expect(page).toHaveURL(/\/$/)
  // a stale g (chord window expired) must not navigate
  await page.goto('/about')
  await page.locator('h1').waitFor()
  await page.keyboard.press('g')
  await page.waitForTimeout(700)
  await page.keyboard.press('p')
  await page.waitForTimeout(200)
  await expect(page).toHaveURL(/\/about/)
})

test('footer build stamp links the changelog', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await expect(page.locator('.build-changelog')).toHaveAttribute('href', '/changelog')
})

test('deep links flash their target section', async ({ page }) => {
  await page.goto('/blog/game-of-life-everywhere')
  const heading = page.locator('.post-body h2[id]').first()
  await heading.waitFor()
  const id = await heading.getAttribute('id')
  await page.goto(`/blog/game-of-life-everywhere#${id}`)
  await expect(page.locator(`#${id}`)).toHaveClass(/is-anchor-target/, { timeout: 5000 })
})

test('a pending g chord shows in the status bar', async ({ page }) => {
  await page.goto('/about')
  await page.locator('h1').waitFor()
  // chord navigation first, with no assertion inside the 500ms chord window
  await page.keyboard.press('g')
  await page.keyboard.press('b')
  await expect(page).toHaveURL(/\/blog\/?$/)
  await expect(page.locator('.status-pending')).toHaveCount(0)
  // an armed chord shows the which-key hint, and expires back to nothing
  await page.keyboard.press('g')
  await expect(page.locator('.status-pending')).toHaveText('g-')
  await expect(page.locator('.status-pending')).toHaveCount(0)
})

test('the live visitor badge stays hidden when no cursors relay is configured', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await expect(page.locator('.status-visitors')).toHaveCount(0)
})

test('a route progress bar appears during navigation', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const bar = page.locator('.route-progress')
  await expect(bar).toBeAttached()
  // the active phase can last only milliseconds on a prerendered site, so
  // watch for it with a MutationObserver instead of racing a selector poll
  await page.evaluate(() => {
    const el = document.querySelector('.route-progress')!
    window.__sawProgress = false
    new MutationObserver(() => {
      if (el.classList.contains('is-active')) window.__sawProgress = true
    }).observe(el, { attributes: true })
  })
  await page.locator('.app-navbar a', { hasText: 'projects' }).first().click()
  await expect(page).toHaveURL(/\/projects/)
  await expect.poll(() => page.evaluate(() => window.__sawProgress)).toBe(true)
})

test('keyboard focus shows a consistent ring on nav and terminal input', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  // a nav link gets the outline ring when focused via keyboard
  const link = page.locator('.app-navbar .nav-link').first()
  await link.focus()
  const outline = await link.evaluate((el) => getComputedStyle(el).outlineWidth)
  expect(parseFloat(outline)).toBeGreaterThan(0)
  // the terminal input, which sets outline:none, gets a box-shadow ring instead
  await page.keyboard.press('`')
  const input = page.locator('#terminal-input')
  await input.focus()
  const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow).not.toBe('none')
})

test('the theme toggle flips the theme (with a reveal where supported)', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme') ?? document.documentElement.className)
  const before = await theme()
  await page.locator('.status-item.status-button[title="Toggle theme"]').click()
  await expect.poll(theme).not.toBe(before)
})

test('triple-clicking the brand glyph toggles CRT mode', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const mark = page.locator('.nav-brand .brand-mark')
  // one action, three rapid clicks — separate click() calls can drift past
  // the 600ms triple-click window on a loaded machine
  await mark.click({ clickCount: 3 })
  await expect(page.locator('html')).toHaveClass(/crt-mode/)
  // and it stayed on the home page (the glyph doesn't navigate)
  await expect(page).toHaveURL(/\/$/)
})

declare global {
  interface Window {
    lv: { hunt(): string, riddle(): string, answer(g: string): string }
    __sawProgress?: boolean
  }
}

test('the console dev hunt chains clues to a reward', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  // the hunt object is exposed on window
  expect(await page.evaluate(() => typeof window.lv?.hunt)).toBe('function')
  expect(await page.evaluate(() => window.lv.hunt())).toBe('step-1')
  // the base64 clue decodes to the next call
  expect(await page.evaluate(() => atob('bHYucmlkZGxlKCk='))).toBe('lv.riddle()')
  expect(await page.evaluate(() => window.lv.riddle())).toBe('step-2')
  // a wrong answer is rejected, the right one ('secrets') solves it and parties
  expect(await page.evaluate(() => window.lv.answer('nope'))).toBe('wrong')
  expect(await page.evaluate(() => window.lv.answer('secrets'))).toBe('solved')
  await expect(page.locator('html.party-mode')).toHaveCount(1)
  // and the reward command works in the terminal
  await page.keyboard.press('`')
  await page.locator('#terminal-input').waitFor()
  await page.fill('#terminal-input', 'hire')
  await page.keyboard.press('Enter')
  await expect(page.locator('.terminal-output')).toContainText('finished the console hunt')
})

test('the status bar shows a live clock', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await expect(page.locator('.status-clock')).toHaveText(/\d{1,2}:\d{2}/)
})
