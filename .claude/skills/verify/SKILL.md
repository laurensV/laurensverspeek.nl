---
name: verify
description: Verify changes to this site at runtime by driving the static build in headless chromium
---

# Verifying laurensverspeek.nl changes

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
  (it serves its own 404) — verify it in dev or trust component reuse.
