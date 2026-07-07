---
name: verify
description: Verify changes to this site at runtime by driving the static build in headless chromium
---

# Verifying laurensverspeek.nl changes

## Fastest path: the committed E2E suite

There is now a Playwright suite in `e2e/` covering the terminal, lvOS, the 404
shell and the pages. To verify most changes, just:

```bash
npm run generate          # builds .output/public (also generates OG images)
npm run test:e2e          # playwright serves .output/public and drives it
```

`scripts/serve-static.mjs` serves the build with a SPA fallback, so the 404
shell hydrates correctly here (unlike a plain file server). Add or extend a
spec in `e2e/` for new UI rather than writing throwaway drive scripts. The
sections below are the manual fallback when a change needs bespoke driving.

## Build & serve

Don't use `npm run dev` for verification: a dev server is often already running on :3000
(`npm run dev` then fails with "Another Nuxt dev is already running"), and Nuxt Content
queries 500 in that dev instance. The deployment surface is the static build:

```bash
npm run generate                                  # → .output/public
cd .output/public && python3 -m http.server 3002  # NOT `npx serve` — it returns 204 for
                                                  # __nuxt_content/*/sql_dump.txt, which breaks
                                                  # all client-side queryCollection() calls
```

## Drive

No playwright in the project; install `playwright-core` in a scratch dir and use the
cached browser at `~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome` as
`executablePath`. Use `waitUntil: 'load'` (+ explicit waits), never `networkidle` —
HMR/cursors websockets keep the network busy forever.

Flows worth driving:
- terminal: `page.keyboard.press('`')` opens it, fill `#terminal-input`, press Enter
- lvOS desktop: type `desktop` in the terminal; icons are `.lvos-icon:has-text("...")`
- blog content client-side: terminal `blog <slug>` and the desktop blog app both depend
  on the sql_dump being served correctly

## Gotchas

- A `pageerror: Transition was aborted because of timeout in DOM update` shows up in
  headless runs — view-transitions noise, pre-existing, not a failure.
- The error page (`app/error.vue`) can't be exercised through a plain static file server
  (it serves its own 404). Verify it against the dev server (:3000) instead, and wait for
  hydration (`waitForSelector('.error-code')` + ~1.5s) before typing into its shell input.
- lvOS and its apps are lazy-mounted (`LazyWebDesktop v-if` in the layout, `Lazy*` app
  components). After the terminal `desktop` command there's a ~700ms delay plus async chunk
  loads before the BIOS `.boot` screen and then `.lvos` appear — poll with `waitForSelector`,
  don't assert at a fixed early offset.
