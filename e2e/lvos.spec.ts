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

test('boot logo sits flush on the dark screen (no stray pre panel)', async ({ page }) => {
  await page.goto('/desktop')
  const logo = page.locator('.boot-logo')
  await logo.waitFor({ timeout: 8000 })
  // Bulma's default <pre> background must be reset, or a pale block shows at top
  await expect(logo).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
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

test('dragging a window to a corner snaps it to a quadrant', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await bootDesktop(page)
  const bar = page.locator('.lvos-window-titlebar').first()
  const box = await bar.boundingBox()
  if (!box) throw new Error('no window to drag')
  await page.mouse.move(box.x + 60, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(6, 6, { steps: 8 }) // top-left corner
  await expect(page.locator('.lvos-snap-preview')).toBeVisible()
  await page.mouse.up()
  const rect = await page.locator('.lvos-window.has-size').first().boundingBox()
  if (!rect) throw new Error('window not sized after snap')
  // top-left quadrant: pinned to the corner, roughly half the width AND height
  expect(rect.x).toBeLessThan(20)
  expect(rect.y).toBeLessThan(20)
  expect(rect.width).toBeLessThan(720)
  expect(rect.height).toBeLessThan(440)
})

test('windows resize from an edge handle (not just the corner)', async ({ page }) => {
  await bootDesktop(page)
  const win = page.locator('.lvos-window').first()
  const before = await win.boundingBox()
  if (!before) throw new Error('no window')
  const handle = win.locator('.lvos-resize.is-e')
  const hb = await handle.boundingBox()
  if (!hb) throw new Error('no east handle')
  await page.mouse.move(hb.x + 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(hb.x + 100, hb.y + hb.height / 2, { steps: 6 })
  await page.mouse.up()
  const after = await win.boundingBox()
  if (!after) throw new Error('no window after resize')
  // dragging the east edge widens the window while its left stays put
  expect(after.width).toBeGreaterThan(before.width + 40)
  expect(Math.abs(after.x - before.x)).toBeLessThan(6)
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

test('taskbar notification center collects toasts', async ({ page }) => {
  await bootDesktop(page)
  // the boot "Welcome to lvOS" notification lands with an unread badge
  await expect(page.locator('.lvos-bell-badge')).toBeVisible()
  await page.locator('.lvos-bell').click()
  const panel = page.locator('.lvos-notif')
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('Welcome to lvOS')
  // clearing empties the history
  await panel.locator('.lvos-notif-clear').click()
  await expect(panel).toContainText('nothing here yet')
})

test('taskbar exposes a fullscreen toggle', async ({ page }) => {
  await bootDesktop(page)
  const btn = page.locator('.lvos-fullscreen')
  await expect(btn).toBeVisible()
  await expect(btn).toHaveAttribute('aria-label', 'Toggle fullscreen')
  // starts un-pressed; clicking must not throw (headless can't truly go fullscreen)
  await expect(btn).toHaveAttribute('aria-pressed', 'false')
  await btn.click()
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
  const minimized = page.locator('.lvos-window.is-minimized')
  await expect(minimized).toHaveCount(1)
  // the genie effect aimed the minimize at the taskbar button (a --gy var is set)
  expect(await minimized.first().evaluate((el) => (el as HTMLElement).style.getPropertyValue('--gy'))).not.toBe('')
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

test('lvOS Game of Life app opens, runs and clears', async ({ page }) => {
  await bootDesktop(page)
  // close the readme window that opens over the icon column on boot
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /^life$/ }).click()
  await page.locator('.desktop-life').waitFor()
  await expect(page.locator('.dl-canvas')).toBeVisible()
  // clear resets the generation counter
  await page.locator('.dl-btn', { hasText: '✕' }).click()
  await expect(page.locator('.dl-stat')).toContainText('gen 0')
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

test('files app browses the terminal home filesystem', async ({ page }) => {
  await bootDesktop(page)
  // close the readme window that covers the icon column
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  // create a directory + file through the desktop terminal
  await page.locator('.lvos-icon', { hasText: /^terminal$/ }).first().click()
  await page.locator('#desktop-terminal-input').waitFor()
  await page.fill('#desktop-terminal-input', 'mkdir stuff')
  await page.keyboard.press('Enter')
  await page.fill('#desktop-terminal-input', 'echo from the shell > stuff/note.txt')
  await page.keyboard.press('Enter')
  // the files app sees the same filesystem
  await page.locator('.lvos-icon', { hasText: /^files$/ }).click()
  const files = page.locator('.files')
  await files.waitFor()
  await files.locator('.files-file', { hasText: 'stuff/' }).click()
  await files.locator('.files-file', { hasText: 'note.txt' }).click()
  await expect(files.locator('.files-preview')).toContainText('from the shell')
  // .. climbs back up to the curated home files
  await files.locator('.files-file', { hasText: '..' }).click()
  await expect(files.locator('.files-file', { hasText: 'readme.md' })).toBeVisible()
})

test('task manager lists windows as processes and kill closes them', async ({ page }) => {
  await bootDesktop(page)
  // close the readme window that covers the icon column
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /^taskmgr$/ }).click()
  const mgr = page.locator('.taskmgr')
  await mgr.waitFor()
  // drag the manager off the icon column so the calculator icon stays clickable
  const bar = page.locator('.lvos-window-titlebar').first()
  const box = await bar.boundingBox()
  if (box) {
    await page.mouse.move(box.x + 60, box.y + 10)
    await page.mouse.down()
    await page.mouse.move(760, 420, { steps: 6 })
    await page.mouse.up()
  }
  await page.locator('.lvos-icon', { hasText: /^calculator$/ }).click()
  await page.locator('.calc').waitFor()
  // real windows and system daemons both appear
  const calcRow = mgr.locator('tr', { hasText: 'calculator' })
  await expect(calcRow).toHaveCount(1)
  await expect(mgr.locator('tr', { hasText: 'init' })).toHaveCount(1)
  // killing the calculator really closes its window
  await calcRow.locator('.taskmgr-kill').click()
  await expect(page.locator('.calc')).toHaveCount(0)
  await expect(mgr.locator('tr', { hasText: 'calculator' })).toHaveCount(0)
  // system processes refuse to die
  await mgr.locator('tr', { hasText: 'init' }).locator('.taskmgr-kill').click()
  await expect(mgr).toContainText('not permitted')
})
