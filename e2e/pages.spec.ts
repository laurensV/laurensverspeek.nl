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

test('blog post shows a table of contents, copy buttons and a reading time', async ({ page }) => {
  await page.goto('/blog/snake-in-the-terminal')
  await expect(page.locator('.post-toc')).toBeVisible()
  await expect(page.locator('.code-copy').first()).toBeVisible()
  // reading time is computed from the rendered AST, so a value proves the walk works
  await expect(page.getByText(/\d+ min read/)).toBeVisible()
})

test('blog index lists the newest post and it opens', async ({ page }) => {
  await page.goto('/blog')
  const link = page.locator('.blog-link', { hasText: 'a window manager in a div' })
  await expect(link).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(/a-window-manager-in-a-div/)
  await expect(page.locator('h1')).toContainText('a window manager in a div')
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
})
