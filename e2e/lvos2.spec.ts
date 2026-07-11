import { test, expect } from '@playwright/test'
import { bootDesktop } from './helpers'

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
  await page.click('.paint-hang')
  await expect(page.locator('.paint-hang')).toContainText('hung on the wall')
  await expect.poll(async () =>
    page.locator('.lvos').evaluate((el) => getComputedStyle(el).backgroundImage)
  ).toContain('data:image/png')
  // and the same drawing can land on the gallery's shelf
  await page.click('.paint-gallery')
  await expect(page.locator('.paint-gallery')).toContainText('in the gallery')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lvos-shots') ?? '')).toContain('data:image/png')
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
  await page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^recycle bin$/ }) }).click()
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
  await page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^mail$/ }) }).click()
  const mail = page.locator('.mail')
  await mail.waitFor()
  await expect(mail.locator('.mail-count')).toContainText('5 unread')
  await mail.locator('.mail-row', { hasText: 'boss key' }).click()
  await expect(mail.locator('.mail-body')).toContainText('very convincing spreadsheet')
  await expect(mail.locator('.mail-count')).toContainText('4 unread')
  await page.locator('.lvos-window[data-win="mail"] .lvos-window-actions button[title="Close"]').click()
  await page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^mail$/ }) }).click()
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

test('desktop icons wear live badges for unread mail and binned files', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  // five unread mails out of the box
  const mailBadge = page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^mail$/ }) }).locator('.lvos-icon-badge')
  await expect(mailBadge).toHaveText('5')
  // rm a file: the recycle bin icon counts it
  await page.locator('.lvos-icon', { hasText: /^terminal$/ }).first().click()
  await page.locator('#desktop-terminal-input').waitFor()
  await page.fill('#desktop-terminal-input', 'echo bye > gone.txt')
  await page.keyboard.press('Enter')
  await page.fill('#desktop-terminal-input', 'rm gone.txt')
  await page.keyboard.press('Enter')
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  const trashBadge = page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^recycle bin$/ }) }).locator('.lvos-icon-badge')
  await expect(trashBadge).toHaveText('1')
  // reading a mail drops the mail badge
  await page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^mail$/ }) }).click()
  await page.locator('.mail .mail-row', { hasText: 'prince' }).click()
  await expect(mailBadge).toHaveText('4')
})

test('the screenshot tool files a snapshot into the gallery', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-start').click()
  await page.locator('.lvos-start-menu button', { hasText: 'screenshot' }).click()
  await expect(page.locator('.lvos-toast', { hasText: 'Screenshot saved' })).toBeVisible()
  // the gallery lists it first
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^gallery$/ }) }).click()
  const gallery = page.locator('.gallery')
  await gallery.waitFor()
  await expect(gallery.locator('.gallery-label')).toContainText('screenshot 1')
  await expect(gallery.locator('.gallery-image')).toHaveAttribute('src', /^data:image\/png/)
})

test('the taskbar tray and boot nudge tell the truth about the battery', async ({ page }) => {
  await bootDesktop(page)
  // headless chromium reports a full, charging battery → tray shows it
  await expect(page.locator('.lvos-battery')).toContainText('%')
  // the battery toast is the honest variant, not the canned "Battery low"
  const toast = page.locator('.lvos-toast', { hasText: /Battery/ })
  await expect(toast).toBeVisible({ timeout: 10000 })
  await expect(toast).toContainText(/Battery at \d+%/)
})

test('file properties dialog reports size, lines and kind', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^terminal$/ }) }).first().click()
  await page.locator('#desktop-terminal-input').waitFor()
  await page.fill('#desktop-terminal-input', 'echo two lines > f.txt')
  await page.keyboard.press('Enter')
  await page.fill('#desktop-terminal-input', 'echo more >> f.txt')
  await page.keyboard.press('Enter')
  await page.locator('.lvos-task', { hasText: 'lvsh' }).click()
  await page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^files$/ }) }).click()
  const files = page.locator('.files')
  await files.locator('.files-file', { hasText: 'f.txt' }).click({ button: 'right' })
  await files.locator('.files-menu button', { hasText: 'properties' }).click()
  const props = files.locator('.files-props')
  await expect(props).toBeVisible()
  await expect(props).toContainText('lines')
  await expect(props).toContainText('txt file')
})

test('a gallery image can be set as the desktop wallpaper', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^gallery$/ }) }).click()
  const gallery = page.locator('.gallery')
  await gallery.waitFor()
  await gallery.locator('.gallery-wallpaper').click()
  await expect(gallery.locator('.gallery-wallpaper')).toContainText('set as wallpaper')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lvos-wallpaper-custom') !== null)).toBe(true)
})

test('the notes icon badges the number of sticky notes', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^notes$/ }) }).click()
  await page.locator('.notes-new').click()
  await page.locator('.note-text').first().fill('a thought')
  const notesBadge = page.locator('.lvos-icon').filter({ has: page.locator('.lvos-icon-label', { hasText: /^notes$/ }) }).locator('.lvos-icon-badge')
  await expect(notesBadge).toHaveText('1')
})
