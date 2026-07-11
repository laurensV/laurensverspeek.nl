import { test, expect } from '@playwright/test'
import { bootDesktop } from './helpers'

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
  // the breadcrumb bar climbs back up to the curated home files
  await expect(files.locator('.files-crumb:disabled')).toHaveText('stuff')
  await files.locator('.files-crumb', { hasText: '~' }).click()
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

test('start menu reboots through the BIOS and shuts down to the site', async ({ page }) => {
  await bootDesktop(page)
  // reboot: CRT power-off, then the BIOS replays and lands back on the desktop
  await page.locator('.lvos-start').click()
  await page.locator('.lvos-start-menu button', { hasText: 'reboot' }).click()
  await expect(page.locator('.lvos.is-powering-off')).toBeVisible()
  await page.locator('.boot').waitFor({ timeout: 10000 })
  await page.locator('.lvos').waitFor({ timeout: 10000 })
  // shut down leaves lvOS for the site
  await page.locator('.lvos-start').click()
  await page.locator('.lvos-start-menu button', { hasText: 'shut down' }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 10000 })
  await expect(page.locator('.hero-name')).toBeVisible()
})

test('shutdown under reduced motion skips the animation and just exits', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await bootDesktop(page)
  await page.locator('.lvos-start').click()
  await page.locator('.lvos-start-menu button', { hasText: 'shut down' }).click()
  // same generous timeout as the animated variant — CI/loaded runners are slow
  await expect(page).toHaveURL(/\/$/, { timeout: 10000 })
})

test('lock screen covers the desktop until any password unlocks it', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-start').click()
  await page.locator('.lvos-start-menu button', { hasText: 'lock' }).click()
  const lock = page.locator('.lock')
  await expect(lock).toBeVisible()
  await expect(lock).toContainText('locked')
  // Escape does NOT log out while locked
  await page.keyboard.press('Escape')
  await expect(page.locator('.lvos')).toBeVisible()
  await expect(lock).toBeVisible()
  // an empty submit gets judged, any real input unlocks
  await page.locator('.lock-input').press('Enter')
  await expect(lock).toContainText('standards')
  await page.locator('.lock-input').fill('hunter2')
  await page.keyboard.press('Enter')
  await expect(lock).toHaveCount(0, { timeout: 5000 })
})

test('the game of life wallpaper renders live behind the desktop', async ({ page }) => {
  await bootDesktop(page)
  await expect(page.locator('.lvos-live-wallpaper')).toHaveCount(0)
  await page.locator('.lvos-start').click()
  // the life wallpaper is the last swatch
  await page.locator('.lvos-wallpaper-swatch').last().click()
  const canvas = page.locator('.lvos-live-wallpaper')
  await expect(canvas).toBeVisible()
  // cells are actually being drawn (canvas has non-blank pixels)
  await expect.poll(() =>
    canvas.evaluate((el: HTMLCanvasElement) => {
      const data = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data
      for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) return true
      return false
    })
  ).toBe(true)
  // the choice persists across a desktop reload
  await page.reload()
  await expect(page.locator('.lvos')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.lvos-live-wallpaper')).toBeVisible()
})

test('titlebar right-click menu pins a window on top and closes it', async ({ page }) => {
  await bootDesktop(page)
  // open a second window so stacking is observable
  await page.locator('.lvos-window-titlebar').first().click({ button: 'right' })
  const menu = page.locator('.lvos-titlemenu')
  await expect(menu).toBeVisible()
  await menu.locator('button', { hasText: 'pin on top' }).click()
  await expect(menu).toHaveCount(0)
  const readme = page.locator('.lvos-window[data-win="readme"]')
  await expect(readme.locator('.lvos-window-title')).toContainText('📌')
  // focusing another window cannot climb above the pinned one
  await page.locator('.lvos-icon', { hasText: /^taskmgr$/ }).click()
  await page.locator('.taskmgr').waitFor()
  const zOf = (sel: string) => page.locator(sel).evaluate((el) => Number(getComputedStyle(el).zIndex))
  expect(await zOf('.lvos-window[data-win="readme"]')).toBeGreaterThan(await zOf('.lvos-window[data-win="taskmgr"]'))
  // unpin, then close via the menu
  await readme.locator('.lvos-window-titlebar').click({ button: 'right' })
  await menu.locator('button', { hasText: 'unpin' }).click()
  await readme.locator('.lvos-window-titlebar').click({ button: 'right' })
  await menu.locator('button', { hasText: 'close' }).click()
  await expect(readme).toHaveCount(0)
})

test('the lvOS snake app runs the shared game engine', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /^snake$/ }).click()
  const snake = page.locator('.desktop-snake')
  await snake.waitFor()
  await expect(snake.locator('.dsnake-frame')).toContainText('SNAKE')
  // quitting shows the game-over result with a play-again button
  await snake.press('q')
  await expect(snake.locator('.dsnake-again')).toBeVisible()
})

test('the image viewer browses the site art gallery', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /^gallery$/ }).click()
  const gallery = page.locator('.gallery')
  await gallery.waitFor()
  const main = gallery.locator('.gallery-image')
  const first = await main.getAttribute('src')
  // next advances to a different image
  await gallery.locator('.gallery-nav[aria-label="Next"]').click()
  await expect(main).not.toHaveAttribute('src', first ?? '')
  // clicking a thumbnail selects it
  await gallery.locator('.gallery-thumb').nth(2).click()
  await expect(gallery.locator('.gallery-thumb.is-active')).toHaveCount(1)
})

test('? opens the lvOS keyboard cheat sheet', async ({ page }) => {
  await bootDesktop(page)
  await page.keyboard.press('?')
  const sheet = page.locator('.lvos-shortcuts')
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('switch between windows')
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  // and lvOS is still there (Escape closed the sheet, not the session)
  await expect(page.locator('.lvos')).toBeVisible()
})

test('ctrl+alt+arrows snap the top window from the keyboard', async ({ page }) => {
  await bootDesktop(page)
  const win = page.locator('.lvos-window[data-win="readme"]')
  await win.waitFor()
  await page.keyboard.press('Control+Alt+ArrowLeft')
  await expect.poll(async () => (await win.boundingBox())!.x).toBe(0)
  const view = page.viewportSize()!
  const half = await win.boundingBox()
  expect(Math.abs(half!.width - view.width / 2)).toBeLessThan(4)
  // up refines the left half into its top quadrant
  await page.keyboard.press('Control+Alt+ArrowUp')
  await expect.poll(async () => (await win.boundingBox())!.height).toBeLessThan(view.height / 2 + 4)
  // down three times: half, bottom quadrant, then restore to free-floating
  await page.keyboard.press('Control+Alt+ArrowDown')
  await page.keyboard.press('Control+Alt+ArrowDown')
  await page.keyboard.press('Control+Alt+ArrowDown')
  await expect.poll(async () => (await win.boundingBox())!.x).toBeGreaterThan(0)
})

test('a paint drawing can hang as the desktop wallpaper', async ({ page }) => {
  await bootDesktop(page)
  // close the readme window that covers the icon column
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: 'lvpaint' }).click()
  const canvas = page.locator('.paint-canvas')
  await canvas.waitFor()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 40, box.y + 40)
  await page.mouse.down()
  await page.mouse.move(box.x + 160, box.y + 120, { steps: 5 })
  await page.mouse.up()
  await page.click('.paint-wallpaper')
  await expect(page.locator('.paint-wallpaper')).toContainText('hung on the wall')
  await expect.poll(async () =>
    page.locator('.lvos').evaluate((el) => getComputedStyle(el).backgroundImage)
  ).toContain('data:image/png')
})

test('rm moves files to the recycle bin, which restores or empties them', async ({ page }) => {
  await bootDesktop(page)
  // close the readme window that covers the icon column
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  // create and delete a file through the desktop terminal
  await page.locator('.lvos-icon', { hasText: /^terminal$/ }).first().click()
  await page.locator('#desktop-terminal-input').waitFor()
  await page.fill('#desktop-terminal-input', 'echo precious data > doomed.txt')
  await page.keyboard.press('Enter')
  await page.fill('#desktop-terminal-input', 'rm doomed.txt')
  await page.keyboard.press('Enter')
  // minimize the terminal so the icon column is clickable again
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  // the bin lists it, restore brings it back
  await page.locator('.lvos-icon', { hasText: /^recycle bin$/ }).click()
  const trash = page.locator('.trash')
  await trash.waitFor()
  await expect(trash.locator('.trash-row', { hasText: 'doomed.txt' })).toBeVisible()
  await trash.locator('.trash-restore').click()
  await expect(trash).toContainText('the bin is empty')
  // the restored file reads back in the terminal
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await page.fill('#desktop-terminal-input', 'cat doomed.txt')
  await page.keyboard.press('Enter')
  await expect(page.locator('.lvos-window[data-win="terminal"]')).toContainText('precious data')
  // delete again and empty the bin for good
  await page.fill('#desktop-terminal-input', 'rm doomed.txt')
  await page.keyboard.press('Enter')
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await trash.locator('.trash-empty-btn').click()
  await expect(trash).toContainText('the bin is empty')
})

test('tile windows arranges every open window into a grid', async ({ page }) => {
  await bootDesktop(page)
  // readme is open; add the calculator so there are two windows
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: 'calculator' }).click()
  await page.locator('.lvos-icon', { hasText: /^clock$/ }).click()
  await page.locator('.lvos-start').click()
  await page.locator('.lvos-start-menu button', { hasText: 'tile windows' }).click()
  // two windows side by side, together spanning the full width
  const calc = await page.locator('.lvos-window[data-win="calc"]').boundingBox()
  const clock = await page.locator('.lvos-window[data-win="clock"]').boundingBox()
  if (!calc || !clock) throw new Error('windows missing after tile')
  const [left, right] = calc.x < clock.x ? [calc, clock] : [clock, calc]
  // sub-pixel wobble from the window-open scale transition is fine
  expect(left.x).toBeLessThan(4)
  expect(left.width + right.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 4)
  expect(Math.abs(right.x - left.width)).toBeLessThan(4)
})

test('about this computer reports uptime and real machine specs', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-start').click()
  await page.locator('.lvos-start-menu button', { hasText: 'about this computer' }).click()
  const about = page.locator('.lvos-about')
  await expect(about).toBeVisible()
  await expect(about).toContainText('a very serious operating system')
  await expect(about).toContainText('a lovely resolution')
  await expect(about).toContainText('enough')
  await expect(about).toContainText(/uptime/)
  // the uptime ticks
  const before = await about.locator('td').nth(1).textContent()
  await expect.poll(() => about.locator('td').nth(1).textContent()).not.toBe(before)
})

test('ps in the desktop terminal lists lvOS windows and kill closes them', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: 'calculator' }).click()
  await page.locator('.calc').waitFor()
  await page.locator('.lvos-icon', { hasText: /^terminal$/ }).first().click()
  await page.locator('#desktop-terminal-input').waitFor()
  await page.fill('#desktop-terminal-input', 'ps')
  await page.keyboard.press('Enter')
  const term = page.locator('.lvos-window[data-win="terminal"]')
  await expect(term).toContainText('lvos:calc')
  await expect(term).toContainText('lvos-session')
  // read the calculator's pid straight from the ps output and kill it
  const text = await term.textContent()
  const pid = /(\d+)\s+R\s+lvos:calc/.exec(text ?? '')?.[1]
  if (!pid) throw new Error('no pid for lvos:calc in ps output')
  await page.fill('#desktop-terminal-input', `kill ${pid}`)
  await page.keyboard.press('Enter')
  await expect(term).toContainText('lvos:calc terminated')
  await expect(page.locator('.lvos-window[data-win="calc"]')).toHaveCount(0)
})

test('the task manager kills a terminal effect and the running game', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  // start an effect and a game from the desktop terminal
  await page.locator('.lvos-icon', { hasText: /^terminal$/ }).first().click()
  await page.locator('#desktop-terminal-input').waitFor()
  await page.fill('#desktop-terminal-input', 'crt')
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveClass(/crt-mode/)
  await page.fill('#desktop-terminal-input', 'snake')
  await page.keyboard.press('Enter')
  await expect(page.locator('.game-frame')).toBeVisible()
  // task manager sees both, with the same names ps uses
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await page.locator('.lvos-icon', { hasText: /^taskmgr$/ }).click()
  const taskmgr = page.locator('.taskmgr')
  await taskmgr.waitFor()
  const crtRow = taskmgr.locator('tr', { hasText: 'crt-filter' })
  await expect(crtRow).toBeVisible()
  await crtRow.locator('.taskmgr-kill').click()
  await expect(page.locator('html')).not.toHaveClass(/crt-mode/)
  const snakeRow = taskmgr.locator('tr', { hasText: 'snake' })
  await expect(snakeRow).toBeVisible()
  await snakeRow.locator('.taskmgr-kill').click()
  await expect(taskmgr.locator('tr', { hasText: 'snake' })).toHaveCount(0)
  // the terminal is back at its prompt, game gone
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await expect(page.locator('.game-frame')).toHaveCount(0)
})

test('notes.txt is one file across the terminal and the vim app', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /^terminal$/ }).first().click()
  await page.locator('#desktop-terminal-input').waitFor()
  await page.fill('#desktop-terminal-input', 'echo written by the shell > notes.txt')
  await page.keyboard.press('Enter')
  // the vim app opens the very same file
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await page.locator('.lvos-icon', { hasText: /^vim$/ }).click()
  const vim = page.locator('.vim-buffer')
  await expect(vim).toHaveValue(/written by the shell/)
  // edit it in vim and write; the terminal reads the change back
  await vim.focus()
  await page.keyboard.press('i')
  await vim.fill('rewritten in the vim app')
  await page.keyboard.press('Escape')
  await page.keyboard.type(':w')
  await page.keyboard.press('Enter')
  await expect(page.locator('.vim-hint')).toContainText('written')
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await page.fill('#desktop-terminal-input', 'cat notes.txt')
  await page.keyboard.press('Enter')
  await expect(page.locator('.lvos-window[data-win="terminal"]')).toContainText('rewritten in the vim app')
})

test('alt+r opens the run dialog and launches apps by name', async ({ page }) => {
  await bootDesktop(page)
  await page.keyboard.press('Alt+r')
  const run = page.locator('.run')
  await expect(run).toBeVisible()
  // tab-completion: 'pa' → paint
  await page.keyboard.type('pa')
  await page.keyboard.press('Tab')
  await expect(run.locator('.run-input')).toHaveValue('paint')
  await page.keyboard.press('Enter')
  await expect(run).toHaveCount(0)
  await expect(page.locator('.lvos-window[data-win="paint"]')).toBeVisible()
  // nonsense flashes an error instead of launching
  await page.keyboard.press('Alt+r')
  await page.keyboard.type('doom')
  await page.keyboard.press('Enter')
  await expect(page.locator('.run')).toContainText('no such app')
  await page.keyboard.press('Escape')
  await expect(page.locator('.run')).toHaveCount(0)
})

test('the files context menu renames a file for the terminal too', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /^terminal$/ }).first().click()
  await page.locator('#desktop-terminal-input').waitFor()
  await page.fill('#desktop-terminal-input', 'echo keep me > draft.txt')
  await page.keyboard.press('Enter')
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await page.locator('.lvos-icon', { hasText: /^files$/ }).click()
  const files = page.locator('.files')
  await files.waitFor()
  // right-click → rename
  await files.locator('.files-file', { hasText: 'draft.txt' }).click({ button: 'right' })
  await files.locator('.files-menu button', { hasText: 'rename' }).click()
  const input = files.locator('.files-rename')
  await input.fill('final.txt')
  await input.press('Enter')
  await expect(files.locator('.files-file', { hasText: 'final.txt' })).toBeVisible()
  // the terminal sees the rename (same filesystem)
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await page.fill('#desktop-terminal-input', 'cat final.txt')
  await page.keyboard.press('Enter')
  await expect(page.locator('.lvos-window[data-win="terminal"]')).toContainText('keep me')
  // and right-click → move to bin lands in the shared recycle bin
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await files.locator('.files-file', { hasText: 'final.txt' }).click({ button: 'right' })
  await files.locator('.files-menu button', { hasText: 'move to bin' }).click()
  await expect(files.locator('.files-file', { hasText: 'final.txt' })).toHaveCount(0)
})

test('an adopted pet wanders the desktop and clicking feeds it', async ({ page }) => {
  // adopt before boot: a pre-aged pet so it has hatched
  await page.addInitScript(() => {
    const t = Date.now() - 5 * 3600000
    localStorage.setItem('lv-pet', JSON.stringify({ name: 'pixel', born: t, lastFed: t, lastPlayed: t }))
  })
  await bootDesktop(page)
  const pet = page.locator('.lvos-pet')
  await expect(pet).toBeVisible()
  await expect(pet).toContainText('pixel')
  await pet.click()
  await expect(pet).toHaveClass(/is-fed/)
  // feeding here counts in the shared state (lastFed bumped to ~now)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lv-pet') ?? '{}'))
  expect(Date.now() - saved.lastFed).toBeLessThan(60_000)
})

test('minesweeper offers difficulty levels and times the game', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /^mines.exe$/ }).click()
  const mines = page.locator('.mines')
  await mines.waitFor()
  // beginner board: 81 cells
  await expect(mines.locator('.mines-cell')).toHaveCount(81)
  // switching level rebuilds the board
  await mines.locator('.mines-level', { hasText: 'intermediate' }).click()
  await expect(mines.locator('.mines-cell')).toHaveCount(16 * 12)
  await expect(mines.locator('.mines-level.is-active')).toHaveText('intermediate')
  // the timer starts on the first dig
  await mines.locator('.mines-cell').first().click()
  await expect(mines.locator('.mines-time')).not.toHaveText('0s', { timeout: 3000 })
  // the chosen level persists across a reopen
  await page.locator('.lvos-window[data-win="minesweeper"] .lvos-window-actions button[title="Close"]').click()
  await page.locator('.lvos-icon', { hasText: /^mines.exe$/ }).click()
  await expect(page.locator('.mines .mines-level.is-active')).toHaveText('intermediate')
})

test('the mail app persists read state and the feed reader eats its own rss', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  // mail: everything starts unread; opening one marks it read, persistently
  await page.locator('.lvos-icon', { hasText: /^mail$/ }).click()
  const mail = page.locator('.mail')
  await mail.waitFor()
  await expect(mail.locator('.mail-count')).toContainText('5 unread')
  await mail.locator('.mail-row', { hasText: 'boss key' }).click()
  await expect(mail.locator('.mail-body')).toContainText('very convincing spreadsheet')
  await expect(mail.locator('.mail-count')).toContainText('4 unread')
  await page.locator('.lvos-window[data-win="mail"] .lvos-window-actions button[title="Close"]').click()
  await page.locator('.lvos-icon', { hasText: /^mail$/ }).click()
  await expect(page.locator('.mail .mail-count')).toContainText('4 unread')
  await page.locator('.lvos-window[data-win="mail"] .lvos-window-actions button[title="Close"]').click()
  // rss: the reader lists the site's real feed and opens posts in the blog app
  await page.locator('.lvos-icon', { hasText: /^rss$/ }).click()
  const rss = page.locator('.rss')
  await rss.waitFor()
  await expect(rss.locator('.rss-item').first()).toBeVisible()
  await rss.locator('.rss-item', { hasText: 'snake' }).click()
  await expect(page.locator('.lvos-window[data-win="blog"]')).toBeVisible()
})

test('the start menu downloads a very real lvos.iso', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-start').click()
  const downloadPromise = page.waitForEvent('download')
  await page.locator('.lvos-start-menu button', { hasText: 'download lvos.iso' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('lvos-2.0.iso')
})

test('the hall of fame gathers every high score in one board', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lv-snake-highscore', '42')
    localStorage.setItem('lvos-mines-best-beginner', '31')
  })
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /^scores$/ }).click()
  const scores = page.locator('.scores')
  await scores.waitFor()
  await expect(scores.locator('tr', { hasText: 'snake' })).toContainText('42')
  await expect(scores.locator('tr', { hasText: 'beginner' })).toContainText('31')
  await expect(scores.locator('tr', { hasText: 'tetris' })).toContainText('no entry yet')
})
