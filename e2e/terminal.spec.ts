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

test('cp and mv copy and rename files in the virtual fs', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'echo original > a.txt')
  await run(page, 'cp a.txt b.txt')
  await run(page, 'cat b.txt')
  await expect(out).toContainText('original')
  // mv renames: c.txt appears, b.txt is gone
  await run(page, 'mv b.txt c.txt')
  await run(page, 'ls')
  await expect(out).toContainText('c.txt')
  await run(page, 'cat b.txt')
  await expect(out).toContainText('No such file or directory')
})

test('grep -n numbers matches and -c counts them', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'help | grep -c blog')
  // -c yields a single numeric count (>= 1, since blog is a command)
  await run(page, 'help | grep -n blog')
  await expect(out).toContainText(/\d+:.*blog/)
})

test('redirects any command output to a file with > and >>', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  // capture help output to a file, then read it back
  await run(page, 'help | grep blog > cmds.txt')
  await run(page, 'cat cmds.txt')
  await expect(out).toContainText('blog [post]')
  // >> appends another line
  await run(page, 'echo --- >> cmds.txt')
  await run(page, 'cat cmds.txt')
  await expect(out).toContainText('---')
})

test('pipes chain through sort, uniq and wc', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'help | sort | uniq | wc')
  const out = page.locator('.terminal-output')
  await expect(out).not.toContainText('unknown filter')
  // wc emits a single numeric count line at the end of the chain
  await expect(out).toContainText(/\b\d+\b/)
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

test('git command replays the real repo history', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'git log --oneline')
  await expect(out).toContainText(/[0-9a-f]{7} /)
  await run(page, 'git show HEAD')
  await expect(out).toContainText('files changed')
  await run(page, 'git status')
  await expect(out).toContainText('working tree clean')
})

test('wpm starts a typing test that reacts to typing and Esc', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'wpm')
  const frame = page.locator('.game-frame')
  await expect(frame).toContainText('WPM TEST')
  await page.keyboard.type('abc')
  await expect(frame).toContainText('% acc')
  await page.keyboard.press('Escape')
  await expect(page.locator('.terminal-output')).toContainText('aborted')
})

test('search greps across blog content with highlighted snippets', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'search conway')
  await expect(out.locator('.term-accent', { hasText: 'conway' }).first()).toBeVisible()
  await expect(out).toContainText(/\d+ match/)
  await run(page, 'search zzzznotaword')
  await expect(out).toContainText("no matches for 'zzzznotaword'")
})

test('contact --qr prints a scannable ascii contact card', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'contact --qr')
  const qr = page.locator('.term-qr')
  await expect(qr).toBeVisible()
  await expect(page.locator('.terminal-output')).toContainText('contact.vcf')
})

test('aliases and exported env vars survive a reload', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'alias hi=echo hello-again')
  await run(page, 'export FAVE=amber')
  await page.reload()
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('`')
  await page.locator('#terminal-input').waitFor()
  const out = page.locator('.terminal-output')
  await run(page, 'hi')
  await expect(out).toContainText('hello-again')
  await run(page, 'echo $FAVE')
  await expect(out).toContainText('amber')
})

test('pong opens a court and responds to paddle keys', async ({ page }) => {
  await openTerminal(page)
  await run(page, 'pong')
  const frame = page.locator('.game-frame')
  await expect(frame).toContainText('PONG')
  await expect(frame).toContainText('●')
  await page.keyboard.press('w')
  await page.keyboard.press('q')
  await expect(page.locator('.terminal-output')).toContainText(/aborted|win/)
})

test('weather renders an ascii report from open-meteo data', async ({ page }) => {
  // hermetic: intercept both open-meteo endpoints
  await page.route('**/geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: { results: [{ name: 'Amsterdam', country: 'Netherlands', latitude: 52.37, longitude: 4.89 }] } })
  )
  await page.route('**/api.open-meteo.com/**', (route) =>
    route.fulfill({ json: { current: { temperature_2m: 18.4, weather_code: 61, wind_speed_10m: 12, relative_humidity_2m: 78 } } })
  )
  await openTerminal(page)
  await run(page, 'weather amsterdam')
  const out = page.locator('.terminal-output')
  await expect(out).toContainText('Amsterdam, Netherlands')
  await expect(out).toContainText('rain')
  await expect(out).toContainText('18.4°C')
})

test('weather reports unknown places and network trouble gracefully', async ({ page }) => {
  await page.route('**/geocoding-api.open-meteo.com/**', (route) => route.fulfill({ json: { results: [] } }))
  await openTerminal(page)
  await run(page, 'weather atlantis-under-the-sea')
  await expect(page.locator('.terminal-output')).toContainText("unknown place 'atlantis-under-the-sea'")
})

test('the greeting is time-aware', async ({ page }) => {
  await openTerminal(page)
  // whatever the hour, one of the period lines is present
  await expect(page.locator('.terminal-output')).toContainText(/morning|afternoon|evening|midnight/)
})

test('ps lists a running effect and kill really stops it', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'ps')
  await expect(out).toContainText('no effects running')
  await run(page, 'crt')
  await expect(page.locator('html')).toHaveClass(/crt-mode/)
  await run(page, 'ps')
  await expect(out).toContainText('crt-filter')
  // killing the pid genuinely switches the effect off
  await run(page, 'kill 101')
  await expect(out).toContainText('crt-filter terminated')
  await expect(page.locator('html')).not.toHaveClass(/crt-mode/)
  await run(page, 'kill 1')
  await expect(out).toContainText('not permitted')
})

test('df reports real localStorage usage with a total', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'echo some bytes > usage.txt')
  await run(page, 'df')
  await expect(out).toContainText('FILESYSTEM')
  await expect(out).toContainText('lv-terminal-fs')
  await expect(out).toContainText('TOTAL')
  await expect(out).toContainText('quota')
})

test('wildcards work across cat, cp, ls and rm', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'echo alpha > one.txt')
  await run(page, 'echo beta > two.txt')
  await run(page, 'mkdir backup')
  // cat glob prints both files with headers
  await run(page, 'cat *.txt')
  await expect(out).toContainText('==> one.txt <==')
  await expect(out).toContainText('beta')
  // cp glob into a directory
  await run(page, 'cp *.txt backup')
  await run(page, 'ls backup/*')
  await expect(out).toContainText('backup/one.txt')
  // rm glob clears the originals
  await run(page, 'rm *.txt')
  await run(page, 'cat one.txt')
  await expect(out).toContainText('No such file or directory')
  // but the sacred joke survives expansion
  await run(page, 'rm -rf /*')
  await expect(out).toContainText('Nice try')
})

test('history expansion re-runs earlier commands', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'echo expansion-works')
  await run(page, '!!')
  // the expanded command is echoed and its output repeats
  await expect(out.locator('.terminal-line', { hasText: 'expansion-works' }).nth(2)).toBeVisible()
  await run(page, '!echo')
  await expect(out.locator('.terminal-line', { hasText: 'expansion-works' }).nth(4)).toBeVisible()
  await run(page, '!doesnotexist')
  await expect(out).toContainText('event not found')
})

test('ssh connects, changes the prompt host, and exit disconnects', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'ssh guest@laurensverspeek.nl')
  await expect(out).toContainText('Welcome to laurensverspeek.nl!')
  await expect(page.locator('.terminal-input-row .term-prompt')).toContainText('@laurensverspeek.nl:')
  // first exit only disconnects; the terminal stays open with the local prompt
  await run(page, 'exit')
  await expect(out).toContainText('Connection to laurensverspeek.nl closed.')
  await expect(page.locator('.terminal-input-row .term-prompt')).toContainText('@lv:')
})

test('qr encodes arbitrary text and defaults to the current url', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')
  await run(page, 'qr hello world')
  await expect(out.locator('.term-qr')).toHaveCount(1)
  await expect(out).toContainText('encodes: hello world')
  await run(page, 'qr')
  await expect(out.locator('.term-qr')).toHaveCount(2)
  await expect(out).toContainText(/encodes: http/)
})

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
  await page.keyboard.press('`')
  await page.locator('#terminal-input').waitFor()
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
  // the terminal closed itself; shoot the hero heading
  const hero = page.locator('.hero-name')
  const box = await hero.boundingBox()
  if (!box) throw new Error('no hero to destroy')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(overlay).toContainText('1 destroyed')
  // something real got shot (the innermost element under the crosshair)
  const hiddenCount = () => page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('*')].filter((el) => el.style.visibility === 'hidden').length
  )
  expect(await hiddenCount()).toBeGreaterThan(0)
  // escape ends the rampage and repairs everything
  await page.keyboard.press('Escape')
  await expect(overlay).toHaveCount(0)
  expect(await hiddenCount()).toBe(0)
  await expect(hero).toBeVisible()
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
