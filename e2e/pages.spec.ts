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

test('404 suggests the nearest page and quick-links navigate', async ({ page }) => {
  await page.goto('/projcts')
  const suggest = page.locator('.error-suggest-link')
  await expect(suggest).toHaveText('/projects')
  await suggest.click()
  await expect(page).toHaveURL(/\/projects/)
})

test('404 shell tab-completes commands', async ({ page }) => {
  await page.goto('/whoops')
  const field = page.locator('.error-input')
  await field.click()
  await field.fill('who')
  await page.keyboard.press('Tab')
  await expect(field).toHaveValue('whoami ')
})

test('blog post shows a table of contents, copy buttons and a reading time', async ({ page }) => {
  await page.goto('/blog/snake-in-the-terminal')
  await expect(page.locator('.post-toc')).toBeVisible()
  await expect(page.locator('.code-copy').first()).toBeVisible()
  // reading time is computed from the rendered AST, so a value proves the walk works
  await expect(page.getByText(/\d+ min read/)).toBeVisible()
  // prose links use the custom style: no default underline, a dotted ::after
  const link = page.locator('.post-body a').first()
  await expect(link).toBeVisible()
  const styles = await link.evaluate((el) => ({
    line: getComputedStyle(el).textDecorationLine,
    dot: getComputedStyle(el, '::after').borderBottomStyle
  }))
  expect(styles.line).toBe('none')
  expect(styles.dot).toBe('dotted')
})

test('clicking the hero game of life opens the /life page', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  // a click (no drag) on the hero canvas navigates to the full-page playground
  await page.locator('.hero-life').click({ position: { x: 120, y: 120 } })
  await expect(page).toHaveURL(/\/life/)
  await expect(page.locator('.life-canvas')).toBeVisible()
})

test('/life and /desktop carry their own OG images', async ({ page }) => {
  await page.goto('/life')
  await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute('content', /og\/life\.svg/)
  await page.goto('/desktop')
  await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute('content', /og\/desktop\.svg/)
})

test('game of life page pauses, steps, clears and places a preset', async ({ page }) => {
  await page.goto('/life')
  await expect(page.locator('.life-canvas')).toBeVisible()
  const stat = page.locator('.life-stat')
  // pause the auto-run, then clear to a known empty state
  await page.locator('.life-btn.is-primary').click()
  await page.locator('.life-btn', { hasText: 'clear' }).click()
  await expect(stat).toContainText('0 cells')
  // one manual step advances the generation counter
  await page.locator('.life-btn', { hasText: 'step' }).click()
  await expect(stat).toContainText('gen 1')
  // placing a preset seeds live cells
  await page.locator('.life-btn', { hasText: 'glider' }).click()
  await expect(stat).not.toContainText('0 cells')
})

// pointer-drawn canvas strokes are sensitive to CPU contention from the
// parallel workers (coalesced pointer events skip cells), so this one test
// may retry — it is rock solid in isolation
test.describe(() => {
  test.describe.configure({ retries: 2 })

  test('game of life page supports draw, shift-erase and zoom', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 760 })
  await page.goto('/life')
  await page.locator('.life-btn.is-primary').click() // pause
  await page.locator('.life-btn', { hasText: 'clear' }).click()
  const stat = page.locator('.life-stat')
  await expect(stat).toContainText('0 cells')
  // drag draws a few live cells
  const canvas = page.locator('.life-canvas')
  await canvas.hover({ position: { x: 200, y: 200 } })
  await page.mouse.down()
  await page.mouse.move(260, 200, { steps: 6 })
  await page.mouse.up()
  await expect(stat).not.toContainText('0 cells')
  // shift-drag over the same area erases back to empty. Under CPU load the
  // browser coalesces pointermove events and a single sweep can skip cells,
  // so sweep again until the board reads empty.
  await page.keyboard.down('Shift')
  for (let pass = 0; pass < 5; pass++) {
    // a coalesced draw event can land a cell on a neighbouring row, so erase a band
    for (const y of [184, 200, 216]) {
      await canvas.hover({ position: { x: 185, y } })
      await page.mouse.down()
      await page.mouse.move(275, y, { steps: 25 })
      await page.mouse.up()
    }
    if ((await stat.textContent())?.includes('0 cells')) break
  }
  await page.keyboard.up('Shift')
  await expect(stat).toContainText('0 cells')
  // zoom changes the board without throwing
  await page.locator('.life-zoom button[aria-label="Zoom in"]').click()
  await expect(canvas).toBeVisible()
  })
})

test('/life respects reduced motion: starts paused, step still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/life')
  await expect(page.locator('.life-canvas')).toBeVisible()
  // paused by default under reduced motion (button offers play, not pause)
  await expect(page.locator('.life-btn.is-primary')).toContainText('play')
  await expect(page.locator('.life-hint')).toContainText('reduced motion')
  // nothing has advanced on its own
  await expect(page.locator('.life-stat')).toContainText('gen 0')
  // but a manual step works
  await page.locator('.life-btn', { hasText: 'step' }).click()
  await expect(page.locator('.life-stat')).toContainText('gen 1')
})

test('hero renders the game-of-life canvas and reacts to the pointer', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const canvas = page.locator('.hero-life-canvas')
  await expect(canvas).toBeAttached()
  // the canvas is sized to its container (not a zero-area element)
  const w = await canvas.evaluate((el: HTMLCanvasElement) => el.width)
  expect(w).toBeGreaterThan(0)
  // painting into it draws cells without throwing
  await page.locator('.hero-life').hover({ position: { x: 60, y: 60 } })
  await page.mouse.down()
  await page.mouse.move(120, 120, { steps: 5 })
  await page.mouse.up()
})

test('home shows terminal-style skill cards', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.skill-card')).toHaveCount(3)
  await expect(page.locator('.skill-file', { hasText: 'blockchain.sol' })).toBeVisible()
})

test('blog headings expose a copyable deep-link anchor', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/blog/game-of-life-everywhere')
  // clear the one-time boot splash so it doesn't intercept the click
  await page.locator('.boot-splash').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
  const heading = page.locator('.post-body h2[id]').first()
  const anchor = heading.locator('.heading-anchor')
  await expect(anchor).toHaveCount(1)
  // the heading sits under the sticky navbar when scrolled to, so dispatch the
  // click on the anchor directly — it still fires the copy handler
  await anchor.evaluate((el) => (el as HTMLElement).click())
  // click copies the section URL and updates the address bar hash
  expect(page.url()).toContain('#')
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('#')
})

test('blog code blocks highlight called-out lines', async ({ page }) => {
  await page.goto('/blog/game-of-life-everywhere')
  const hl = page.locator('.post-body .line.highlight').first()
  await expect(hl).toBeVisible()
  // the highlight reads via a left accent rail, not colour alone
  const border = await hl.evaluate((el) => parseFloat(getComputedStyle(el).borderLeftWidth))
  expect(border).toBeGreaterThan(0)
})

test('blog post shows related posts by shared tags', async ({ page }) => {
  await page.goto('/blog/a-window-manager-in-a-div')
  await expect(page.locator('.post-related')).toBeVisible()
  const related = page.locator('.related-link')
  await expect(related.first()).toBeVisible()
  // a related post links somewhere in /blog/
  await expect(related.first()).toHaveAttribute('href', /\/blog\//)
})

test('blog has an RSS subscribe affordance that copies the feed url', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/blog')
  await expect(page.locator('.rss-open')).toHaveAttribute('href', '/rss.xml')
  const copy = page.locator('.rss-copy')
  await copy.click()
  await expect(copy).toContainText('copied')
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('/rss.xml')
})

test('blog index lists the newest post and it opens', async ({ page }) => {
  await page.goto('/blog')
  const link = page.locator('.blog-link', { hasText: 'a window manager in a div' })
  await expect(link).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(/a-window-manager-in-a-div/)
  await expect(page.locator('h1')).toContainText('a window manager in a div')
})

test('about timeline commits expand to a stack diff', async ({ page }) => {
  await page.goto('/about')
  const details = page.locator('.gitlog-more').first()
  await details.scrollIntoViewIfNeeded()
  const firstAdd = details.locator('.diff-add').first()
  // collapsed by default, then expands on click
  await expect(firstAdd).toBeHidden()
  await details.locator('summary').click()
  await expect(firstAdd).toBeVisible()
  await expect(firstAdd).toContainText('+')
})

test('/uses and /now show the refreshed content', async ({ page }) => {
  await page.goto('/uses')
  await expect(page.getByText('./design-docs')).toBeVisible()
  await expect(page.getByText('Ghostty')).toBeVisible()
  await page.goto('/now')
  await expect(page.getByText('./away from the keyboard')).toBeVisible()
})

test('project filters support arrow-key navigation', async ({ page }) => {
  await page.goto('/projects')
  const all = page.locator('.filter-flag', { hasText: '--all' })
  await all.focus()
  await expect(all).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowRight')
  const second = page.locator('.filter-flag').nth(1)
  await expect(second).toHaveAttribute('aria-selected', 'true')
  await expect(second).toBeFocused()
  // Home returns to --all
  await page.keyboard.press('Home')
  await expect(all).toHaveAttribute('aria-selected', 'true')
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

test('serves humans.txt and .well-known/security.txt', async ({ request }) => {
  const humans = await request.get('/humans.txt')
  expect(humans.ok()).toBeTruthy()
  expect(await humans.text()).toContain('Laurens Verspeek')
  const security = await request.get('/.well-known/security.txt')
  expect(security.ok()).toBeTruthy()
  const body = await security.text()
  expect(body).toContain('Contact: mailto:')
  expect(body).toContain('Expires:')
})

test('command palette opens and filters', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('Control+k')
  await expect(page.locator('.palette-window')).toBeVisible()
  await page.locator('.palette-input').fill('uses')
  await expect(page.locator('.palette-item.is-active')).toContainText('Uses')
  // the matched characters are highlighted in the label
  await expect(page.locator('.palette-item.is-active .palette-match')).toContainText('Uses')
})

test('command palette opens the game of life', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('Control+k')
  await page.locator('.palette-input').fill('conway')
  await page.locator('.palette-item', { hasText: 'Game of Life' }).click()
  await expect(page).toHaveURL(/\/life/)
})

test('command palette exposes action commands (CRT toggle)', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.keyboard.press('Control+k')
  await page.locator('.palette-input').fill('crt')
  await page.locator('.palette-item', { hasText: 'Toggle CRT mode' }).click()
  await expect(page.locator('html')).toHaveClass(/crt-mode/)
})

test('blog tags filter the list with a shareable ?tag= url', async ({ page }) => {
  await page.goto('/blog')
  const entries = page.locator('.blog-entry')
  const all = await entries.count()
  expect(all).toBeGreaterThan(1)
  await page.locator('.tag-btn', { hasText: '#games' }).first().click()
  await expect(page).toHaveURL(/tag=games/)
  await expect.poll(() => entries.count()).toBeLessThan(all)
  await expect(page.locator('.tag-filter')).toContainText("grep '#games'")
  // clearing restores the full list and drops the param
  await page.locator('.tag-clear').click()
  await expect.poll(() => entries.count()).toBe(all)
  // a direct visit with the param starts filtered
  await page.goto('/blog?tag=games')
  await expect.poll(() => entries.count()).toBeLessThan(all)
})

test('contact page serves a vCard and shows a QR contact card', async ({ page, request }) => {
  const vcf = await request.get('/contact.vcf')
  expect(vcf.ok()).toBeTruthy()
  expect(vcf.headers()['content-type']).toContain('text/vcard')
  const body = await vcf.text()
  expect(body).toContain('BEGIN:VCARD')
  expect(body).toContain('FN:Laurens Verspeek')

  await page.goto('/contact')
  const box = page.locator('.vcard-box')
  await box.locator('summary').click()
  await expect(box.locator('.vcard-download')).toHaveAttribute('href', '/contact.vcf')
  const qr = box.locator('.vcard-qr')
  await expect(qr).toBeVisible()
  expect((await qr.textContent())!.length).toBeGreaterThan(100)
})

test('external prose links carry the arrow marker, internal ones do not', async ({ page }) => {
  await page.goto('/blog/rebuilding-this-site')
  const external = page.locator('.post-body a[href^="http"]').first()
  await expect(external).toBeVisible()
  const bg = await external.evaluate((el) => getComputedStyle(el).backgroundImage)
  expect(bg).toContain('svg')
  // internal links keep a clean background
  const internal = page.locator('.post-body a[href^="/"]').first()
  if (await internal.count()) {
    expect(await internal.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe('none')
  }
})

test('rss feed ships full post content for readers', async ({ request }) => {
  const res = await request.get('/rss.xml')
  expect(res.ok()).toBeTruthy()
  const body = await res.text()
  expect(body).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"')
  expect(body).toContain('<content:encoded><![CDATA[')
  // whole posts, not just descriptions: headings and code blocks are present
  expect(body).toContain('<h2>')
  expect(body).toContain('<pre><code')
})

test('/changelog renders the baked git history', async ({ page }) => {
  await page.goto('/changelog')
  const entries = page.locator('.changelog-entry')
  await expect(entries.first()).toBeVisible()
  expect(await entries.count()).toBeGreaterThan(10)
  // hashes, HEAD marker and diffstat counts all come from the real repo
  await expect(page.locator('.changelog-hash').first()).toHaveText(/^[0-9a-f]{7}$/)
  await expect(page.locator('.changelog-ref').first()).toContainText('HEAD')
  await expect(page.locator('.changelog-stat').first()).toContainText('+')
})
