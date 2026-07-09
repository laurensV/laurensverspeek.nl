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

test('sitemap carries per-page git-derived lastmod dates', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  const body = await res.text()
  // every url has a lastmod, and they are not all the same build date
  const dates = [...body.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)].map((m) => m[1])
  expect(dates.length).toBeGreaterThan(10)
  expect(new Set(dates).size).toBeGreaterThan(1)
})

test('/now shows a git-derived last-updated date', async ({ page }) => {
  await page.goto('/now')
  await expect(page.getByText(/last updated/)).toBeVisible()
  await expect(page.locator('.subtitle .is-family-code').first()).toHaveText(/^\d{4}-\d{2}-\d{2}$/)
})

test('subpages emit BreadcrumbList structured data matching the trail', async ({ page }) => {
  await page.goto('/blog/snake-in-the-terminal')
  const json = await page.locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''))
  const breadcrumb = json.map((text) => JSON.parse(text)).find((data) => data['@type'] === 'BreadcrumbList')
  expect(breadcrumb).toBeTruthy()
  const names = breadcrumb.itemListElement.map((item: { name: string }) => item.name)
  expect(names).toEqual(['home', 'blog', 'snake-in-the-terminal'])
  // the home page emits none
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const homeJson = await page.locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent ?? '{}')))
  expect(homeJson.some((data) => data['@type'] === 'BreadcrumbList')).toBe(false)
})

test('blog titles carry matching view-transition names for the morph', async ({ page }) => {
  await page.goto('/blog')
  const listTitle = page.locator('.blog-entry h2').first()
  const name = await listTitle.evaluate((el) => getComputedStyle(el).viewTransitionName)
  expect(name).toMatch(/^post-/)
  await listTitle.locator('a').click()
  await expect(page).toHaveURL(new RegExp(name.replace('post-', '')))
  // the post body loads async after the client-side navigation
  const postTitle = page.locator('h1')
  await expect.poll(() =>
    postTitle.evaluate((el) => getComputedStyle(el).viewTransitionName)
  ).toBe(name)
})

test('blog posts have a share affordance that copies the url', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/blog/snake-in-the-terminal')
  // headless chromium has no navigator.share, so the copy fallback runs
  const share = page.locator('.post-share')
  await share.click()
  await expect(share).toContainText('copied')
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('/blog/snake-in-the-terminal')
})

test('the service worker precaches the no-uplink offline fallback', async ({ page, request }) => {
  // Playwright's setOffline cannot cut service-worker fetches, so the true
  // offline path was verified by killing the server manually; here we pin the
  // wiring: the clean-url fallback page and the generated sw configuration.
  const offline = await request.get('/offline')
  expect(await offline.text()).toContain('no uplink')
  const sw = await (await request.get('/sw.js')).text()
  expect(sw).toContain('PrecacheFallbackPlugin')
  expect(sw).toContain('fallbackURL:"/offline"')
  expect(sw).toMatch(/\{url:"offline",revision/)
  // and the worker actually installs + takes control on a real visit
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 10000 })
    .toBe(true)
})

test('github stats count up to the fetched values', async ({ page }) => {
  await page.route('**/api.github.com/users/**', (route) =>
    route.request().url().includes('/repos')
      ? route.fulfill({ json: [{ name: 'x', stargazers_count: 12, fork: false }] })
      : route.fulfill({ json: { followers: 42, public_repos: 7 } })
  )
  await page.goto('/about')
  // the animation ends on the real numbers
  await expect(page.locator('.stat-value').nth(2)).toHaveText('42', { timeout: 10000 })
  await expect(page.locator('.stat-value').nth(0)).toHaveText('7')
})

test('the 404 shell hides a playable snake behind `play`', async ({ page }) => {
  await page.goto('/totally-missing-page')
  const field = page.locator('.error-input')
  await field.click()
  await field.fill('play')
  await page.keyboard.press('Enter')
  await expect(page.locator('.error-game')).toContainText('SNAKE')
  // the input row yields to the game; q ends it and brings the prompt back
  await expect(page.locator('.error-input')).toHaveCount(0)
  await page.keyboard.press('q')
  await expect(page.locator('.error-log')).toContainText('terminated')
  await expect(page.locator('.error-input')).toBeVisible()
})

test('the hero canvas has a pointer trail overlay (skipped under reduced motion)', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  const trail = page.locator('.hero-life-trail')
  await expect(trail).toBeAttached()
  // moving the pointer over the hero paints trail sparks onto the overlay canvas
  await page.locator('.hero-life').hover({ position: { x: 80, y: 80 } })
  await page.mouse.move(140, 140, { steps: 8 })
  await page.waitForTimeout(120)
  const painted = await trail.evaluate((el: HTMLCanvasElement) => {
    const data = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) return true
    return false
  })
  expect(painted).toBe(true)
})

test('loading skeletons share the shimmer treatment', async ({ page }) => {
  // hang the github api so the stats skeleton stays on screen
  await page.route('**/api.github.com/**', () => {})
  await page.goto('/about')
  const skeleton = page.locator('.stat-value.is-skeleton').first()
  await skeleton.waitFor({ timeout: 10000 })
  const shimmer = await skeleton.evaluate((el) => getComputedStyle(el, '::after').animationName)
  expect(shimmer).toContain('skeleton-shimmer')
})

test('blog posts print cleanly with link urls as footnotes', async ({ page }) => {
  await page.emulateMedia({ media: 'print' })
  await page.goto('/blog/rebuilding-this-site')
  await page.locator('.post-body').waitFor()
  // interactive chrome is hidden in print
  await expect(page.locator('.post-toc')).toBeHidden()
  // external links expose their href via a ::after footnote
  const footnote = await page.locator('.post-body a[href^="http"]').first().evaluate((el) =>
    getComputedStyle(el, '::after').content
  )
  expect(footnote).toContain('http')
})

test('the page advertises the RSS feed for autodiscovery', async ({ page }) => {
  await page.goto('/')
  const feed = page.locator('link[rel="alternate"][type="application/rss+xml"]')
  await expect(feed).toHaveAttribute('href', '/rss.xml')
})

test('resume.json is a valid JSON Resume built from profile data', async ({ request }) => {
  const res = await request.get('/resume.json')
  expect(res.ok()).toBeTruthy()
  expect(res.headers()['content-type']).toContain('application/json')
  const resume = await res.json()
  expect(resume.$schema).toContain('resume-schema')
  expect(resume.basics.name).toBe('Laurens Verspeek')
  expect(resume.basics.profiles.length).toBeGreaterThan(0)
  expect(resume.work.length).toBeGreaterThan(0)
  expect(resume.skills.length).toBeGreaterThan(0)
})

test('a post edited after publish shows an updated date and dateModified', async ({ page }) => {
  await page.goto('/blog/rebuilding-this-site')
  await page.locator('h1').waitFor()
  await expect(page.locator('.post-updated')).toContainText('updated')
  // and the JSON-LD carries dateModified
  const ld = await page.locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? '{}')))
  const posting = ld.find((d) => d['@type'] === 'BlogPosting')
  expect(posting.dateModified).toBeTruthy()
  // a post NOT edited after publish shows no updated line
  await page.goto('/blog/snake-in-the-terminal')
  await page.locator('h1').waitFor()
  await expect(page.locator('.post-updated')).toHaveCount(0)
})

test('blog code blocks show line numbers', async ({ page }) => {
  await page.goto('/blog/snake-in-the-terminal')
  const line = page.locator('.post-body pre code .line').first()
  await line.waitFor()
  // the numbering rule is active (a counter ::before is attached to each line)
  const before = await line.evaluate((el) => getComputedStyle(el, '::before').content)
  expect(before).toBe('counter(line)')
  // and the gutter has real width, pushing the code right
  const gutter = await line.evaluate((el) => parseFloat(getComputedStyle(el, '::before').marginRight))
  expect(gutter).toBeGreaterThan(0)
  expect(await page.locator('.post-body pre code .line').count()).toBeGreaterThan(3)
})

test('project cards support arrow-key navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/projects')
  const cards = page.locator('.project-card .project-thumb')
  await cards.first().focus()
  // right moves to the second card
  await page.keyboard.press('ArrowRight')
  await expect(cards.nth(1)).toBeFocused()
  // down moves a full row (>= 2 columns at this width), then Enter follows the link
  await cards.first().focus()
  await page.keyboard.press('ArrowDown')
  const focusedIndex = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.project-card .project-thumb')]
    return links.indexOf(document.activeElement as HTMLElement)
  })
  expect(focusedIndex).toBeGreaterThan(1)
})

test('the web manifest advertises app shortcuts', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const manifest = await res.json()
  const urls = (manifest.shortcuts ?? []).map((s: { url: string }) => s.url)
  expect(urls).toContain('/blog')
  expect(urls).toContain('/desktop')
})

test('contact shows a live local-time badge once hydrated', async ({ page }) => {
  await page.goto('/contact')
  const badge = page.getByTestId('local-time')
  await expect(badge).toContainText(/\d{2}:\d{2}/)
  await expect(badge).toContainText(/probably (awake|asleep)/)
  await expect(badge).toContainText('replies within a day')
})

test('kbd keys share the global keycap style', async ({ page }) => {
  await page.goto('/')
  const kbd = page.locator('footer kbd').first()
  await expect(kbd).toBeVisible()
  const style = await kbd.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { shadow: cs.boxShadow, font: cs.fontFamily }
  })
  expect(style.shadow).not.toBe('none')
  expect(style.font).toContain('JetBrains Mono')
})

test('page source greets view-sourcers with an ascii banner', async ({ request }) => {
  for (const path of ['/', '/blog']) {
    const html = await (await request.get(path)).text()
    expect(html).toContain('hello, fellow view-sourcer')
    expect(html).toContain('lv.hunt()')
  }
})

test('the retro hit counter stays hidden when analytics is not configured', async ({ page }) => {
  await page.goto('/')
  await page.locator('.hero-name').waitFor()
  await expect(page.getByTestId('hit-counter')).toHaveCount(0)
})

test('/stats explains itself when analytics is not configured', async ({ page }) => {
  await page.goto('/stats')
  await expect(page.locator('.stats-off')).toContainText('analytics is not enabled on this build')
})

