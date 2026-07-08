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

test('virtual filesystem: create, read, list, remove and persist a file', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'echo hello from the fs > notes.txt')
  await run(page, 'cat notes.txt')
  await expect(out).toContainText('hello from the fs')
  await run(page, 'ls')
  await expect(out).toContainText('notes.txt')

  // survives a full reload (persisted to localStorage)
  await page.reload()
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('`')
  await page.locator('#terminal-input').waitFor()
  await run(page, 'cat notes.txt')
  await expect(page.locator('.terminal-output')).toContainText('hello from the fs')

  // and rm removes it
  await run(page, 'rm notes.txt')
  await run(page, 'cat notes.txt')
  await expect(page.locator('.terminal-output')).toContainText('No such file or directory')
})

test('nested directories: mkdir, cd into it, path-aware prompt, and cd back', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  const prompt = page.locator('.terminal-input-row .term-prompt')
  await run(page, 'mkdir workspace')
  await run(page, 'cd workspace')
  await expect(prompt).toContainText('~/workspace')
  await run(page, 'echo build the thing > todo.txt')
  await run(page, 'ls')
  await expect(out).toContainText('todo.txt')
  await run(page, 'cat todo.txt')
  await expect(out).toContainText('build the thing')
  // back up to home, where the directory is listed
  await run(page, 'cd ..')
  await expect(prompt).not.toContainText('workspace')
  await run(page, 'ls')
  await expect(out).toContainText('workspace/')
})

test('matrix command shows the rain and a key dismisses it', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'matrix')
  const overlay = page.locator('.matrix-overlay')
  await expect(overlay).toBeVisible({ timeout: 3000 })
  await page.keyboard.press('Enter')
  await expect(overlay).toBeHidden()
})

test('life runs an ASCII Game of Life and quits with q', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'life')
  const frame = page.locator('.game-frame')
  await expect(frame).toBeVisible()
  await expect(frame).toContainText("game of life")
  await page.keyboard.press('q')
  await expect(page.locator('.terminal-output')).toContainText('exited after')
  await expect(frame).toHaveCount(0)
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

test('Tab cycles through multiple completion candidates', async ({ page }) => {
  await openTerminal(page)
  const field = page.locator('#terminal-input')
  await page.fill('#terminal-input', 'co')
  // "co" matches colorscheme, contact, cowsay (sorted) — Tab rotates through them
  await page.keyboard.press('Tab')
  await expect(field).toHaveValue('colorscheme ')
  await page.keyboard.press('Tab')
  await expect(field).toHaveValue('contact ')
  await page.keyboard.press('Tab')
  await expect(field).toHaveValue('cowsay ')
  await page.keyboard.press('Tab')
  await expect(field).toHaveValue('colorscheme ')
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
  // the window title bar uses the identity too, not a hardcoded "visitor"
  await expect(page.locator('.terminal-title')).toContainText('codewizard@')
  await expect(page.locator('.terminal-title')).not.toContainText('visitor@')
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
  // the search shows the match position + count
  await expect(page.locator('.terminal-search-count')).toContainText('[1/1]')
})
