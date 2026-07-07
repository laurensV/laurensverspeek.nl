import { test, expect, type Page } from '@playwright/test'

// Drive the terminal the way a keyboard user would: open with `~`, type, Enter.
const openTerminal = async (page: Page) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('`')
  await page.locator('#terminal-input').waitFor()
}

const run = async (page: Page, command: string) => {
  await page.fill('#terminal-input', command)
  await page.keyboard.press('Enter')
}

test('opens and lists commands', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'help')
  await expect(page.locator('.terminal-output')).toContainText('List available commands')
})

test('pipes command output through grep', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'help | grep blog')
  const out = page.locator('.terminal-output')
  await expect(out).toContainText('blog [post]')
  await expect(out).not.toContainText('List available commands')
})

test('reads a blog post as markdown in the terminal', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'blog snake-in-the-terminal')
  await expect(page.locator('.terminal-output')).toContainText('putting a playable snake game')
  await expect(page.locator('.terminal-output')).toContainText('```ts')
})

test('expands environment variables', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'echo hello $USER')
  await expect(page.locator('.terminal-output')).toContainText('hello visitor')
})

test('switches accent color via colorscheme', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'colorscheme emerald')
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--bulma-primary-h')))
    .toBe('152deg')
})

test('tab-completes command names and arguments', async ({ page }) => {
  await openTerminal(page)
  await page.fill('#terminal-input', 'colorsc')
  await page.keyboard.press('Tab')
  await expect(page.locator('#terminal-input')).toHaveValue('colorscheme ')
  await page.fill('#terminal-input', 'cd ab')
  await page.keyboard.press('Tab')
  await expect(page.locator('#terminal-input')).toHaveValue('cd about')
})
