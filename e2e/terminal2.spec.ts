import { test, expect } from '@playwright/test'
import { openTerminal, pressTerminalKey, run } from './helpers'

test('stats explains itself when analytics is not configured', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'stats')
  await expect(page.locator('.terminal-output')).toContainText('analytics is not enabled')
})

test('| copy sends piped output to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'echo clipboard-bound')
  await run(page, 'echo clipboard-bound | copy')
  await expect(out).toContainText('copied 1 line to the clipboard')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('clipboard-bound')
  // filters still run before the copy stage
  await run(page, 'help | grep blog | copy')
  await expect(out).toContainText(/copied \d+ lines? to the clipboard/)
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('blog')
})

test('the site pages are real folders, and editing a blog post changes the site', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  // the pages are seeded as directories at home
  await run(page, 'ls')
  await expect(out).toContainText('blog/')
  await expect(out).toContainText('about/')
  // blog posts arrive from the content layer — poll until they land
  await expect(async () => {
    await run(page, 'ls blog')
    await expect(out).toContainText('rebuilding-this-site.md')
  }).toPass({ timeout: 15000 })
  // cat reads the actual markdown source, frontmatter and all
  await run(page, 'cat blog/rebuilding-this-site.md')
  await expect(out).toContainText('title:')
  // site content really deletes (with a hint), and reseed regrows it
  await run(page, 'rm about/bio.md')
  await expect(out).toContainText(`'reseed' brings the originals back`)
  await run(page, 'cat about/bio.md')
  await expect(out).toContainText('No such file or directory')
  await run(page, 'reseed about')
  await expect(out).toContainText('restored 1 site file')
  await run(page, 'cat about/bio.md')
  await expect(out).toContainText('# about')
  // and it's editable: overwrite a post, and the rendered page shows the edit
  await run(page, 'echo # hijacked by the shell > blog/rebuilding-this-site.md')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('lv-terminal-fs') ?? ''))
    .toContain('hijacked by the shell')
  await page.goto('/blog/rebuilding-this-site')
  await expect(page.locator('.post-edited-note')).toBeVisible()
  await expect(page.locator('.post-body')).toContainText('hijacked by the shell')
  // reseeding the post drops the edit — the page shows the original again
  await pressTerminalKey(page)
  await run(page, 'reseed blog/rebuilding-this-site.md')
  await expect(page.locator('.terminal-output')).toContainText('restored 1 site file')
  await page.keyboard.press('Escape')
  await expect(page.locator('.post-edited-note')).toHaveCount(0)
  await expect(page.locator('.post-body')).not.toContainText('hijacked by the shell')
})

test('cd - and pushd/popd remember directories', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  const promptText = () => page.locator('.terminal-input-row .term-prompt').textContent()
  await run(page, 'mkdir depths')
  await run(page, 'cd depths')
  expect(await promptText()).toContain('~/depths')
  // `cd ..` moves without the page navigation `cd ~` would trigger
  await run(page, 'cd ..')
  await run(page, 'cd -')
  await expect.poll(promptText).toContain('~/depths')
  // pushd hops and remembers; popd returns
  await run(page, 'cd ..')
  await run(page, 'pushd depths')
  await expect(out).toContainText('~/depths ~')
  await run(page, 'popd')
  await expect.poll(promptText).not.toContain('~/depths')
  await run(page, 'popd')
  await expect(out).toContainText('directory stack empty')
})

test('terminal text scales via fontsize and ctrl keys, and persists', async ({ page }) => {
  await openTerminal(page)
  const output = page.locator('.terminal-output')
  const sizeOf = () => output.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  const base = await sizeOf()
  await run(page, 'fontsize 1.3')
  await expect(output).toContainText('font scale: 1.3×')
  expect(await sizeOf()).toBeGreaterThan(base * 1.2)
  await page.keyboard.press('Control+-')
  await expect.poll(sizeOf).toBeLessThan(base * 1.3)
  // survives a reload
  await page.reload()
  await page.locator('.hero-name').waitFor()
  await pressTerminalKey(page)
  expect(await sizeOf()).toBeGreaterThan(base * 1.05)
  await run(page, 'fontsize reset')
  await expect.poll(sizeOf).toBeCloseTo(base, 0)
})

test('do a barrel roll spins the page (unless reduced motion)', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'do a barrel roll')
  await expect(page.locator('html')).toHaveClass(/barrel-roll/)
  await expect(page.locator('html')).not.toHaveClass(/barrel-roll/, { timeout: 5000 })
})

test('barrel roll respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openTerminal(page)
  await run(page, 'barrel-roll')
  await expect(page.locator('.terminal-output')).toContainText('imagine')
  await expect(page.locator('html')).not.toHaveClass(/barrel-roll/)
})

test('destroy mode shoots real dom elements and esc repairs the site', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'destroy')
  const overlay = page.locator('.destroyer')
  await expect(overlay).toBeVisible()
  // the ship spawns bottom-centre facing up; a click fires straight ahead,
  // and the bullet travels up the centre column through the (centred) hero
  const hero = page.locator('.hero-name')
  await hero.waitFor()
  // click position is irrelevant now (mouse fires forward, it doesn't aim);
  // loose a few shots straight up so one is sure to hit the centred hero column
  for (let i = 0; i < 4; i++) await page.mouse.click(640, 300 + i * 20)
  await expect(overlay).toContainText(/[1-9]\d* destroyed/)
  // something real got shot (the innermost element under the crosshair) —
  // poll, since the hit registers before the shatter animation hides it
  const hiddenCount = () => page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('*')].filter((el) => el.style.visibility === 'hidden').length
  )
  await expect.poll(hiddenCount).toBeGreaterThan(0)
  // escape ends the rampage and repairs everything
  await page.keyboard.press('Escape')
  await expect(overlay).toHaveCount(0)
  await expect.poll(hiddenCount).toBe(0)
  await expect(hero).toBeVisible()
})

test('the destroyer ship flies the page: diving scrolls it, manual scrolling is grounded', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'destroy')
  await expect(page.locator('.destroyer')).toBeVisible()
  // manual scrolling is disabled while the ship owns the page
  await page.waitForTimeout(300)
  const initial = await page.evaluate(() => window.scrollY)
  await page.mouse.move(640, 360)
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => window.scrollY)).toBe(initial)
  // the ship starts nose-up; rotate a half-turn to face down, then thrust —
  // flying into the bottom edge drives the page scroll
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(1000) // ~π rad at 3.2 rad/s ≈ facing down
  await page.keyboard.up('ArrowRight')
  await page.keyboard.down('ArrowUp')
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 }).toBeGreaterThan(120)
  await page.keyboard.up('ArrowUp')
  await page.keyboard.press('Escape')
  await expect(page.locator('.destroyer')).toHaveCount(0)
})

test('five quick clicks on the status bar version arm destroy mode', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const version = page.locator('.status-bar button', { hasText: 'v2.0.0' })
  for (let i = 0; i < 5; i++) await version.click()
  await expect(page.locator('.destroyer')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.destroyer')).toHaveCount(0)
})

test('nano edits and saves a file in the vfs', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'nano note.md')
  const frame = page.locator('.game-frame')
  await expect(frame).toContainText('GNU nano-ish')
  await page.keyboard.type('written in nano')
  await expect(frame).toContainText('written in nano')
  await page.keyboard.press('Control+s')
  await expect(frame).toContainText(/wrote \d+ line/)
  await page.keyboard.press('Control+x')
  await run(page, 'cat note.md')
  await expect(out).toContainText('written in nano')
})

test('vim is real now: modal editing and :wq', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'vim poem.txt')
  const frame = page.locator('.game-frame')
  await expect(frame).toContainText('poem.txt')
  await page.keyboard.press('i')
  await expect(frame).toContainText('-- INSERT --')
  await page.keyboard.type('roses are amber')
  await page.keyboard.press('Escape')
  await page.keyboard.type(':wq')
  await page.keyboard.press('Enter')
  await expect(out).toContainText('written')
  await run(page, 'cat poem.txt')
  await expect(out).toContainText('roses are amber')
})

test('help is grouped into categories', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'help')
  await expect(out).toContainText('## your filesystem')
  await expect(out).toContainText('## games')
  await expect(out).toContainText('## shell & system')
})

test('sysinfo prints a neofetch-style session card', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'sysinfo')
  await expect(out).toContainText('browser')
  await expect(out).toContainText('resolution')
  await expect(out).toContainText(/\d+×\d+/)
  await expect(out).toContainText('localStorage')
})

test('say explains itself when live cursors are not configured', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'say hello world')
  await expect(page.locator('.terminal-output')).toContainText('not enabled on this build')
})

test('asciicam renders the webcam as ascii and q stops it', async ({ page, context }) => {
  await context.grantPermissions(['camera'])
  await openTerminal(page)
  await run(page, 'asciicam')
  // a fake camera produces frames; the game area fills with ascii
  const frame = page.locator('.game-frame')
  await expect(frame).toBeVisible({ timeout: 8000 })
  await expect.poll(() => frame.textContent().then((t) => (t ?? '').length)).toBeGreaterThan(200)
  await page.keyboard.press('q')
  await expect(page.locator('.terminal-output')).toContainText('camera off')
})

test('uptime reports how long the page has been open', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'uptime')
  await expect(page.locator('.terminal-output')).toContainText(/up .*load average/)
})

test('curl really fetches a url (and keeps the easter egg for our domain)', async ({ page }) => {
  await page.route('**/api.example.com/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: '{"hello":"world"}' })
  )
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'curl https://api.example.com/thing')
  await expect(out).toContainText('"hello": "world"')
  // our own domain still returns the playful canned page
  await run(page, 'curl laurensverspeek.nl')
  await expect(out).toContainText('the real fun is behind the ~ key')
})

test('the tab title reflects the running command and restores on close', async ({ page }) => {
  await openTerminal(page)
  const original = await page.title()
  await run(page, 'help')
  await expect.poll(() => page.title()).toContain('~ help')
  await page.keyboard.press('Escape')
  await expect.poll(() => page.title()).toBe(original)
})

test('navigating updates the browser tab title', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.goto('/blog')
  await expect.poll(() => page.title()).toContain('Blog')
})

test('id and hostname print identity info', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'id')
  await expect(out).toContainText(/uid=1000\(.+\)/)
  await run(page, 'hostname')
  await expect(out).toContainText('laurensverspeek.nl')
})

test('ls -l shows a long listing', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'echo hi > note.txt')
  await run(page, 'ls -l')
  await expect(out).toContainText(/total \d+/)
  await expect(out).toContainText('-rw-r--r--')
  await expect(out).toContainText('note.txt')
})

test('chmod plays along and tail -f follows a file', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'echo log line one > app.log')
  await run(page, 'chmod 777 app.log')
  await expect(out).toContainText('world-writable')
  // tail prints the file, then -f streams live log lines until q
  await run(page, 'tail app.log')
  await expect(out).toContainText('log line one')
  await run(page, 'tail -f app.log')
  await expect(page.locator('.game-frame')).toContainText('following')
  await expect(out).toContainText(/\[\d{2}:\d{2}:\d{2}\]/, { timeout: 4000 })
  await page.keyboard.press('q')
  await expect(out).toContainText('stopped following app.log')
})

test('chains commands with &&, || and ;', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  const outputLines = page.locator('.terminal-line.is-output')
  // ; runs everything in order
  await run(page, 'echo one; echo two')
  await expect(outputLines.filter({ hasText: 'one' }).first()).toBeVisible()
  await expect(outputLines.filter({ hasText: 'two' }).first()).toBeVisible()
  // && short-circuits after a failure: the rescued echo must not run
  await run(page, 'cat missing.txt && echo reached')
  await expect(out).toContainText('No such file or directory')
  await expect(outputLines.filter({ hasText: 'reached' })).toHaveCount(0)
  // || is the rescue path — and only fires after a failure
  await run(page, 'cat missing.txt || echo rescued')
  await expect(outputLines.filter({ hasText: 'rescued' })).toHaveCount(1)
  await run(page, 'echo fine || echo fallback')
  await expect(outputLines.filter({ hasText: 'fallback' })).toHaveCount(0)
  // a dangling && is a shell syntax error
  await run(page, 'echo hi &&')
  await expect(out).toContainText("lvsh: syntax error near unexpected token `&&'")
})

test('man renders a registry-generated page with SEE ALSO', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'man ls')
  await expect(out).toContainText('LS(1)')
  await expect(out).toContainText('NAME')
  await expect(out).toContainText('SYNOPSIS')
  // SEE ALSO cross-links the other filesystem commands
  await expect(out).toContainText('SEE ALSO')
  await expect(out).toContainText('cat(1)')
})

test('telnet only knows the towel host and plays the asciimation', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'telnet example.com')
  await expect(out).toContainText('could not resolve')
  await run(page, 'telnet towel.blinkenlights.nl')
  await expect(out).toContainText('Connected to towel.blinkenlights.nl')
  const frame = page.locator('.game-frame')
  await expect(frame).toContainText('A long time ago')
  // scenes advance on their own
  await expect(frame).toContainText(/W\s+A\s+R\s+S/, { timeout: 6000 })
  await page.keyboard.press('q')
  await expect(out).toContainText('Connection closed.')
})

test('async commands show a braille spinner while fetching', async ({ page }) => {
  await page.route('**/geocoding-api.open-meteo.com/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900))
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ results: [{ name: 'Testville', latitude: 1, longitude: 1 }] })
    })
  })
  await page.route('**/api.open-meteo.com/**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ current: { temperature_2m: 20, weather_code: 1, wind_speed_10m: 5, relative_humidity_2m: 40 } })
  }))
  await openTerminal(page)
  await run(page, 'weather testville')
  const spinner = page.locator('.terminal-spinner')
  await expect(spinner).toBeVisible()
  await expect(spinner).toContainText('asking open-meteo about testville')
  // once the forecast lands, the spinner goes away
  await expect(page.locator('.terminal-output')).toContainText('Testville', { timeout: 5000 })
  await expect(spinner).toHaveCount(0)
})

test('emacs refuses with an escalating bit', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'emacs')
  await expect(out).toContainText('the house is at peace')
  await run(page, 'emacs')
  await expect(out).toContainText('persistence noted')
  await run(page, 'emacs')
  await expect(out).toContainText('heat death of the universe')
})

test('fireworks launches a show that ps lists and kill 1231 ends', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'fireworks')
  const overlay = page.locator('.fireworks-overlay')
  await expect(overlay).toBeVisible()
  await expect(overlay).toContainText('Esc (or kill 1231) ends the show')
  // the terminal closed itself after launching; reopen it over the show
  await expect(page.locator('#terminal-input')).toHaveCount(0)
  await pressTerminalKey(page)
  await run(page, 'ps')
  await expect(page.locator('.terminal-output')).toContainText('fireworks.sh')
  await run(page, 'kill 1231')
  await expect(page.locator('.terminal-output')).toContainText('[1231] fireworks.sh terminated')
  await expect(overlay).toHaveCount(0)
})

test('fireworks under reduced motion prints ascii art instead', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openTerminal(page)
  await run(page, 'fireworks')
  await expect(page.locator('.terminal-output')).toContainText('one artisanal firework, hold the motion')
  await expect(page.locator('.fireworks-overlay')).toHaveCount(0)
})

test('adventure explores the site as a dungeon and saves on Esc', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'adventure')
  const frame = page.locator('.game-frame')
  await expect(frame).toContainText('ADVENTURE')
  await expect(frame).toContainText('the home directory')
  await page.keyboard.type('go west')
  await page.keyboard.press('Enter')
  await expect(frame).toContainText('/uses workshop')
  await page.keyboard.type('examine keyboard')
  await page.keyboard.press('Enter')
  await expect(frame).toContainText('amber key')
  // Esc saves and quits back to the shell
  await page.keyboard.press('Escape')
  await expect(page.locator('.terminal-output')).toContainText('the dungeon holds its breath')
  // running it again resumes in the workshop
  await run(page, 'adventure')
  await expect(frame).toContainText('resumed')
  await page.keyboard.press('Escape')
})

test('tmux splits the terminal into independent panes', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'tmux')
  const panes = page.locator('.terminal-pane')
  await expect(panes).toHaveCount(2)
  // the new pane grabbed focus and has its own prompt + scrollback
  await expect(page.locator('#terminal-input-1')).toBeFocused()
  await page.fill('#terminal-input-1', 'echo hello from pane two')
  await page.keyboard.press('Enter')
  await expect(panes.nth(1)).toContainText('hello from pane two')
  await expect(panes.nth(0)).not.toContainText('hello from pane two')
  // ctrl+b ← moves focus back to the original pane
  await page.keyboard.press('Control+b')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('#terminal-input')).toBeFocused()
  // ctrl+b → then ctrl+b x closes the second pane
  await page.keyboard.press('Control+b')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Control+b')
  await page.keyboard.press('x')
  await expect(panes).toHaveCount(1)
  await expect(page.locator('#terminal-input')).toBeFocused()
})

test('pet: adopt a tamagotchi that lives in the status bar and survives reload', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'pet')
  await expect(out).toContainText('no pet yet')
  await run(page, 'pet adopt pixel')
  await expect(out).toContainText('pixel has been adopted')
  // it appears in the status bar as an egg
  const statusPet = page.locator('.status-pet')
  await expect(statusPet).toContainText('pixel')
  await run(page, 'pet feed')
  await expect(out).toContainText('munches happily')
  await run(page, 'pet')
  await expect(out).toContainText('stage: egg')
  // persists across a reload
  await page.reload()
  await page.locator('.hero-name').waitFor()
  await expect(page.locator('.status-pet')).toContainText('pixel')
  // and can be released
  await pressTerminalKey(page)
  await run(page, 'pet release')
  await expect(page.locator('.terminal-output')).toContainText('waddles off')
  await expect(page.locator('.status-pet')).toHaveCount(0)
})

test('sh runs a script from the virtual filesystem with a trace', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'echo echo hello-from-script > s.sh')
  await run(page, 'echo whoami >> s.sh')
  await run(page, 'sh s.sh')
  await expect(out).toContainText('+ echo hello-from-script')
  await expect(out).toContainText('hello-from-script')
  await expect(out).toContainText('+ whoami')
  await run(page, 'sh nope.sh')
  await expect(out).toContainText('sh: nope.sh: No such file or directory')
})

test('kill 7 terminates your own shell', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'kill 7')
  await expect(page.locator('.terminal-window')).toHaveCount(0)
  // it went down on record: reopening shows the farewell
  await pressTerminalKey(page)
  await expect(page.locator('.terminal-output')).toContainText('terminating your own shell. bold.')
})

test('battery reports the real charge state (or honest mains power)', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'battery')
  const out = page.locator('.terminal-output')
  // chromium exposes the Battery API; other engines get the mains joke
  await expect(out).toContainText(/(%\s—\s(charging|discharging))|mains and optimism/)
})

test('tips deals a random usage tip', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'tips')
  await expect(page.locator('.terminal-output')).toContainText('💡')
})

test('| less pages long output and q quits the pager', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'help | less')
  const frame = page.locator('.game-frame')
  await expect(frame).toContainText('less —')
  await expect(frame).toContainText('q quit')
  // j scrolls; the position indicator advances
  const before = await frame.textContent()
  await page.keyboard.press('j')
  await expect.poll(async () => (await frame.textContent()) !== before).toBe(true)
  // q closes the pager
  await page.keyboard.press('q')
  await expect(frame).toHaveCount(0)
})

test('leaderboard explains itself when no relay is configured', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'leaderboard')
  await expect(page.locator('.terminal-output')).toContainText('no relay on this build')
  // tab-completes the game names
  await page.fill('#terminal-input', 'leaderboard sn')
  await page.keyboard.press('Tab')
  await expect(page.locator('#terminal-input')).toHaveValue('leaderboard snake')
})

test('mail lists the lvOS inbox and reading a message clears its unread flag', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'mail')
  const output = page.locator('.terminal-output')
  await expect(output).toContainText('5 unread')
  await expect(output).toContainText('URGENT BUSINESS PROPOSAL')
  await run(page, 'mail 3')
  await expect(output).toContainText('definitely.real@royal.example')
  await expect(output).toContainText('localStorage bytes')
  // the shared read-state: a second listing shows one fewer unread
  await run(page, 'mail')
  await expect(output).toContainText('4 unread')
})

test('pong online degrades to the house AI when no relay is configured', async ({ page }) => {
  await openTerminal(page)
  await page.fill('#terminal-input', 'pong on')
  await page.keyboard.press('Tab')
  await expect(page.locator('#terminal-input')).toHaveValue('pong online')
  await page.keyboard.press('Enter')
  await expect(page.locator('.terminal-output')).toContainText('no relay on this build')
  // the solo game stepped in
  await expect(page.locator('.game-frame')).toContainText('PONG')
  await page.keyboard.press('q')
  await expect(page.locator('.terminal-output')).toContainText(/pong aborted|wins/)
})
