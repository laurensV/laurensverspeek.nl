import { test, expect } from '@playwright/test'

test('404 renders an interactive recovery shell', async ({ page }) => {
  await page.goto('/this-page-does-not-exist')
  await expect(page.locator('.error-code')).toContainText('404')
  await page.locator('.error-input').click()
  await page.locator('.error-input').fill('ls')
  await page.keyboard.press('Enter')
  await expect(page.locator('.error-log')).toContainText('projects/')
})

test('404 shell cd navigates home', async ({ page }) => {
  await page.goto('/nope-nope')
  await page.locator('.error-input').click()
  await page.locator('.error-input').fill('cd /projects')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/projects/)
})

test('404 suggests the nearest page and quick-links navigate', async ({ page }) => {
  await page.goto('/projcts')
  const suggest = page.locator('.error-suggest-link')
  await expect(suggest).toHaveText('/projects')
  await suggest.click()
  await expect(page).toHaveURL(/\/projects/)
})

test('404 shell tab-completes commands', async ({ page }) => {
  await page.goto('/whoops')
  const field = page.locator('.error-input')
  await field.click()
  await field.fill('who')
  await page.keyboard.press('Tab')
  await expect(field).toHaveValue('whoami ')
})

test('blog post shows a table of contents, copy buttons and a reading time', async ({ page }) => {
  await page.goto('/blog/snake-in-the-terminal')
  await expect(page.locator('.post-toc')).toBeVisible()
  await expect(page.locator('.code-copy').first()).toBeVisible()
  // reading time is computed from the rendered AST, so a value proves the walk works
  await expect(page.getByText(/\d+ min read/)).toBeVisible()
  // prose links use the custom style: no default underline, a dotted ::after
  const link = page.locator('.post-body a').first()
  await expect(link).toBeVisible()
  const styles = await link.evaluate((el) => ({
    line: getComputedStyle(el).textDecorationLine,
    dot: getComputedStyle(el, '::after').borderBottomStyle
  }))
  expect(styles.line).toBe('none')
  expect(styles.dot).toBe('dotted')
})

test('hero renders the game-of-life canvas and reacts to the pointer', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const canvas = page.locator('.hero-life-canvas')
  await expect(canvas).toBeAttached()
  // the canvas is sized to its container (not a zero-area element)
  const w = await canvas.evaluate((el: HTMLCanvasElement) => el.width)
  expect(w).toBeGreaterThan(0)
  // painting into it draws cells without throwing
  await page.locator('.hero-life').hover({ position: { x: 60, y: 60 } })
  await page.mouse.down()
  await page.mouse.move(120, 120, { steps: 5 })
  await page.mouse.up()
})

test('home shows terminal-style skill cards', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.skill-card')).toHaveCount(3)
  await expect(page.locator('.skill-file', { hasText: 'blockchain.sol' })).toBeVisible()
})

test('blog post shows related posts by shared tags', async ({ page }) => {
  await page.goto('/blog/a-window-manager-in-a-div')
  await expect(page.locator('.post-related')).toBeVisible()
  const related = page.locator('.related-link')
  await expect(related.first()).toBeVisible()
  // a related post links somewhere in /blog/
  await expect(related.first()).toHaveAttribute('href', /\/blog\//)
})

test('blog index lists the newest post and it opens', async ({ page }) => {
  await page.goto('/blog')
  const link = page.locator('.blog-link', { hasText: 'a window manager in a div' })
  await expect(link).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(/a-window-manager-in-a-div/)
  await expect(page.locator('h1')).toContainText('a window manager in a div')
})

test('/uses and /now show the refreshed content', async ({ page }) => {
  await page.goto('/uses')
  await expect(page.getByText('./design-docs')).toBeVisible()
  await expect(page.getByText('Ghostty')).toBeVisible()
  await page.goto('/now')
  await expect(page.getByText('./away from the keyboard')).toBeVisible()
})

test('project filters narrow the grid', async ({ page }) => {
  await page.goto('/projects')
  // leaving cards are display:none during the transition, so count only visible
  const visible = page.locator('.project-card:visible')
  const all = await visible.count()
  await page.locator('.filter-flag', { hasText: '--work' }).click()
  await expect.poll(() => visible.count()).toBeLessThan(all)
  expect(await visible.count()).toBeGreaterThan(0)
})

test('project detail page has a package.json card and og image', async ({ page }) => {
  await page.goto('/projects/nosana')
  await expect(page.locator('.detail-pkg')).toContainText('"name": "nosana"')
  const og = page.locator('head meta[property="og:image"]')
  await expect(og).toHaveAttribute('content', /og\/project-nosana\.svg/)
})

test('command palette opens and filters', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('Control+k')
  await expect(page.locator('.palette-window')).toBeVisible()
  await page.locator('.palette-input').fill('uses')
  await expect(page.locator('.palette-item.is-active')).toContainText('Uses')
  // the matched characters are highlighted in the label
  await expect(page.locator('.palette-item.is-active .palette-match')).toContainText('Uses')
})

test('command palette exposes action commands (CRT toggle)', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('Control+k')
  await page.locator('.palette-input').fill('crt')
  await page.locator('.palette-item', { hasText: 'Toggle CRT mode' }).click()
  await expect(page.locator('html')).toHaveClass(/crt-mode/)
})
