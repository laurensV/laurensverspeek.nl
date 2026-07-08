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

test('dragging a window to an edge shows a snap preview, then snaps', async ({ page }) => {
  await bootDesktop(page)
  const bar = page.locator('.lvos-window-titlebar').first()
  const box = await bar.boundingBox()
  if (!box) throw new Error('no window to drag')
  await page.mouse.move(box.x + 60, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(6, 320, { steps: 8 })
  // Aero-style ghost appears while hovering the edge
  await expect(page.locator('.lvos-snap-preview')).toBeVisible()
  await page.mouse.up()
  // preview clears and the window is now sized (snapped to the left half)
  await expect(page.locator('.lvos-snap-preview')).toHaveCount(0)
  await expect(page.locator('.lvos-window.has-size').first()).toBeVisible()
})

test('Alt+Tab cycles focus between open windows', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-icon', { hasText: 'calculator' }).click()
  await page.locator('.calc').waitFor()
  const winByTitle = (t: string) =>
    page.locator('.lvos-window').filter({ has: page.locator('.lvos-window-title', { hasText: t }) })
  const zOf = (t: string) => winByTitle(t).evaluate((el) => Number(getComputedStyle(el).zIndex))
  // the just-opened calculator is on top
  expect(await zOf('calculator')).toBeGreaterThan(await zOf('readme'))
  await page.keyboard.press('Alt+Tab')
  // focus wraps back to the readme window
  await expect.poll(async () => (await zOf('readme')) > (await zOf('calculator'))).toBe(true)
})

test('sticky notes app creates, edits and persists a note', async ({ page }) => {
  await bootDesktop(page)
  const notesWindow = page.locator('.lvos-window')
    .filter({ has: page.locator('.lvos-window-title', { hasText: 'sticky notes' }) })
  // the readme window opens over the icon column on boot — close it first
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /^notes$/ }).click()
  await page.locator('.notes').waitFor()
  await page.locator('.notes-new').click()
  await page.locator('.note-text').first().fill('remember to ship the portfolio')
  await expect(page.locator('.notes-meta')).toContainText('1 note')
  // reopening after closing the window restores the saved note
  await notesWindow.locator('.lvos-window-actions button[title="Close"]').click()
  await expect(notesWindow).toHaveCount(0)
  await page.locator('.lvos-icon', { hasText: /^notes$/ }).click()
  await expect(page.locator('.note-text').first()).toHaveValue('remember to ship the portfolio')
})

test('taskbar toggles the calendar and minimises a window', async ({ page }) => {
  await bootDesktop(page)
  // the clock button toggles the calendar popover
  await page.locator('.lvos-clock').click()
  await expect(page.locator('.lvos-calendar')).toBeVisible()
  await page.locator('.lvos-clock').click()
  await expect(page.locator('.lvos-calendar')).toHaveCount(0)
  // the readme task button minimises, then restores its window
  const task = page.locator('.lvos-task').first()
  await task.click()
  await expect(page.locator('.lvos-window.is-minimized')).toHaveCount(1)
  await task.click()
  await expect(page.locator('.lvos-window.is-minimized')).toHaveCount(0)
})

test('start menu opens an app and switches wallpaper', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-start').click()
  await expect(page.locator('.lvos-start-menu')).toBeVisible()
  // pick the second wallpaper swatch
  await page.locator('.lvos-wallpaper-swatch').nth(1).click()
  await expect(page.locator('.lvos-wallpaper-swatch.is-active')).toHaveCount(1)
  // opening settings from the start menu closes the menu
  await page.locator('.lvos-start-menu button', { hasText: 'settings' }).click()
  await expect(page.locator('.lvos-start-menu')).toHaveCount(0)
  await expect(page.locator('.lvos-window-title', { hasText: 'settings' })).toBeVisible()
})

test('hovering a taskbar item peeks its window', async ({ page }) => {
  await bootDesktop(page)
  await expect(page.locator('.lvos-window.is-peek')).toHaveCount(0)
  await page.locator('.lvos-task-wrap').first().hover()
  await expect(page.locator('.lvos-window.is-peek')).toHaveCount(1)
  await page.mouse.move(400, 300)
  await expect(page.locator('.lvos-window.is-peek')).toHaveCount(0)
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
  await page.fill('#desktop-terminal-input', 'echo hello-from-desktop')
  await page.keyboard.press('Enter')
  await expect(page.locator('.desktop-terminal')).toContainText('hello-from-desktop')
})
