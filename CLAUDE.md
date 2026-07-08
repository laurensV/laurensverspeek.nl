# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal portfolio site (laurensverspeek.nl) — Nuxt 4 + TypeScript + Bulma 1, generated as a fully static site.

## Commands

```bash
npm run dev        # dev server on http://localhost:3000
npm run lint       # eslint
npm run typecheck  # vue-tsc via nuxt typecheck
npm run test       # vitest unit tests (pure logic in tests/, no Nuxt boot)
npm run generate   # static build → .output/public
npm run preview    # preview the production build
```

CI (`.github/workflows/deploy_gh-pages.yml`) runs `lint`, `typecheck`, `test`, `generate` and the Playwright `test:e2e` on every push to `main`, then deploys `.output/public` to GitHub Pages — all must pass, so run them before committing.

## Content lives in data files, not components

Pages and components render from central data modules; edit these rather than hardcoding content in templates:

- `app/data/profile.ts` — name, bio, skills, timeline, socials (read by nearly everything, including the terminal)
- `app/data/projects.ts` — projects incl. detail-page stories (`/projects/[slug]`)
- `app/data/uses.ts`, `app/data/now.ts` — the `/uses` and `/now` pages
- `content/blog/*.md` — blog posts via Nuxt Content; frontmatter schema (date, description, tags) is enforced in `content.config.ts`

## Architecture

**Terminal system** (the site's centerpiece, opened with `~`): `app/composables/useTerminal.ts` is a shared command interpreter — all state lives in `useState` so the navbar, footer and `TerminalOverlay.vue` talk to the same terminal instance. Commands are defined in a registry inside that composable (with `hidden: true` for easter eggs, listed by `secrets`). Games (snake, hangman) live in `app/utils/terminalGames.ts` behind a `GameHandle` interface that takes over terminal input; ASCII toys (cowsay, figlet, fortune) in `app/utils/terminalToys.ts`.

**Site-wide effects** are decoupled from the terminal via `useState` flags (`useSiteEffects.ts` plus flags like `fx-train`, `fx-party`, `boot-replay`): the terminal command flips the flag, and a corresponding component in `app/components/` (`MatrixRain`, `SlTrain`, `PartyMode`, `WebDesktop`, …) mounted in the layout/app shell watches it. Follow this pattern when adding a new effect.

**lvOS desktop**: `WebDesktop.vue` (window manager: draggable windows, taskbar, icons) with individual apps in `app/components/desktop/`. Activated by the `desktop`/`startx` terminal command via the `fx-desktop` flag.

**Theming**: Bulma v1 configured through `@use "bulma/sass" with (...)` in `app/assets/scss/global.scss` (primary color `#ffba00`, Inter + JetBrains Mono). Dark/light mode uses `@nuxtjs/color-mode` with `dataValue: 'theme'` — Bulma v1 themes key off the `data-theme` attribute on `<html>`. Style with Bulma CSS variables (`var(--bulma-*)`) so both themes work.

**Server routes**: `server/routes/rss.xml.ts` and `sitemap.xml.ts` are prerendered at generate time (listed in `nitro.prerender.routes`) — they only run at build, not at runtime.

**Optional integrations** (off by default, enabled via env vars at build time):
- `NUXT_PUBLIC_GOATCOUNTER=<code>` — analytics (`app/plugins/analytics.client.ts`, `useAnalytics.ts`); terminal commands emit anonymous usage events
- `NUXT_PUBLIC_CURSORS_WS=wss://…` — live visitor cursors (`LiveCursors.vue`); `realtime/cursors-server.mjs` is a standalone Node WebSocket relay, not part of the Nuxt build

## Conventions

- `vue/no-v-html` is deliberately disabled: terminal output and icon paths are trusted, authored strings. Never pipe user-derived input through `v-html`.
- Sass deprecation warnings from Bulma are intentionally silenced in `nuxt.config.ts` (`quietDeps`, `silenceDeprecations`) — don't "fix" them.
- The site must remain fully static (`nuxt generate`); don't add server routes or APIs that need a runtime server. Anything dynamic is either client-side (GitHub stats) or an external opt-in service (cursors relay).
