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
  await run(page, 'export GREETING=world')
  await run(page, 'echo hello $GREETING')
  await expect(page.locator('.terminal-output')).toContainText('hello world')
})

test('switches accent color via colorscheme', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'colorscheme emerald')
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--bulma-primary-h')))
    .toBe('152deg')
})

test('cal prints the current month, which resolves builtins, uname reports the system', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'cal')
  const out = page.locator('.terminal-output')
  await expect(out).toContainText('Su Mo Tu We Th Fr Sa')
  await run(page, 'which help')
  await expect(out).toContainText('help: lvsh builtin')
  await run(page, 'which nope-not-real')
  await expect(out).toContainText('which: no nope-not-real in (lvsh builtins)')
  await run(page, 'uname -a')
  await expect(out).toContainText('lvsh laurensverspeek.nl 2.0.0')
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

test('pwd reflects the current route and prompt shows the cwd', async ({ page }) => {
  await page.goto('/projects')
  await page.locator('.filter-flags').waitFor()
  await expect(page.locator('.project-card').first()).toBeVisible()
  await page.keyboard.press('`')
  await page.locator('#terminal-input').waitFor()
  // prompt is route-derived, so it should read ~/projects immediately
  await expect(page.locator('.terminal-input-row .term-prompt')).toContainText('~/projects')
  await run(page, 'pwd')
  // pwd resolves ~ against $HOME (/home/<handle>) and ends in /projects
  await expect(page.locator('.terminal-output')).toContainText('/projects')
})

test('whoami and nick change the identity', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'nick codewizard')
  await expect(page.locator('.terminal-input-row .term-prompt')).toContainText('codewizard@lv')
  await run(page, 'whoami')
  await expect(page.locator('.terminal-output')).toContainText('codewizard')
})

test('tree renders the site as a directory tree', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'tree')
  const out = page.locator('.terminal-output')
  await expect(out).toContainText('├── projects/')
  await expect(out).toContainText('├── blog/')
  await expect(out).toContainText('directories,')
})

test('ctrl+r searches command history', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'echo findme-zebra')
  await page.fill('#terminal-input', '')
  await page.keyboard.press('Control+r')
  await page.keyboard.type('zebra')
  await expect(page.locator('.terminal-search-match')).toContainText('echo findme-zebra')
})
