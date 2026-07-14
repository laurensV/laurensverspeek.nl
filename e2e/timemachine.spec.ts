import { test, expect } from '@playwright/test'
import { bootDesktop, openTerminal, run } from './helpers'

// The Time Machine's actual travel serves past builds from jsDelivr (external
// network) and reloads the page, so it isn't exercised here — these cover the
// deterministic, offline surface: the deploy manifest driving the lvOS app and
// the terminal `git checkout` ref handling. The full travel round-trip is
// verified manually against the built site.

test('the lvOS Time Machine app lists every deploy', async ({ page }) => {
  await bootDesktop(page)
  await page.locator('.lvos-window-actions button[title="Close"]').first().click()
  await page.locator('.lvos-icon', { hasText: /time machine/ }).click()

  const tm = page.locator('.tm')
  await tm.waitFor()
  // the manifest is baked at build time and reaches back to the 2020 site
  await expect(tm.locator('.tm-sub')).toContainText('deploys')
  const rows = tm.locator('.tm-row')
  expect(await rows.count()).toBeGreaterThan(10)
  // the newest deploy is tagged as the live one, and years group the timeline
  await expect(tm.locator('.tm-row.is-latest .tm-tag')).toContainText('live now')
  await expect(tm.locator('.tm-year', { hasText: '2020' })).toHaveCount(1)
  await expect(rows.first().locator('.tm-go')).toBeVisible()
})

test('git checkout validates refs and leaves git log intact', async ({ page }) => {
  await openTerminal(page)
  const out = page.locator('.terminal-output')

  // the real history still lists (regression on the shared git command)
  await run(page, 'git log -n 3')
  await expect(out).toContainText('commit ')

  // git tag lists the deploys as releases, back to the 2020 site
  await run(page, 'git tag')
  await expect(out).toContainText('releases')
  await expect(out).toContainText('2020-09-10')

  // no argument prints usage, not an error
  await run(page, 'git checkout')
  await expect(out).toContainText('usage: git checkout')

  // an unknown ref is rejected the way git rejects a bad pathspec
  await run(page, 'git checkout zzzzzzz')
  await expect(out).toContainText("did not match any deployed version")
})
