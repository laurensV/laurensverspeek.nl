# Architecture

A tour of how laurensverspeek.nl is put together, for anyone (including future
me) opening the codebase cold. The one-line summary: **a fully static Nuxt 4
site where all the "dynamic" behavior is client-side state shared through
`useState` keys.**

## The golden rules

1. **Fully static.** `npm run generate` must produce a complete site in
   `.output/public`. No runtime server, no API routes that live past the
   build. Anything dynamic is client-side (GitHub stats, the terminal) or an
   opt-in external service (the cursors relay).
2. **Content lives in data files**, not components: `app/data/*.ts`,
   `content/blog/*.md`. Components render whatever those declare.
3. **Shared state goes through `STATE_KEYS`** (`app/utils/stateKeys.ts`).
   Two components that must agree use the same `useState(STATE_KEYS.x)` key;
   the registry exists so typos can't create silently-split state.

## The terminal (`app/composables/useTerminal.ts`)

The centerpiece. One composable holds the interpreter; every caller (navbar,
footer, overlay, the lvOS terminal window) shares its state via `useState`.

- **Lazily mounted:** the overlay and command palette (which drag in the whole
  command registry) are `<Lazy… v-if="open">` in the layout, so a visitor who
  never presses `~`/⌘K never downloads them. Always-mounted chrome opens them
  through `useTerminalLauncher`/`usePaletteLauncher` — tiny composables that only
  flip the shared open flag (and queue a command to run on mount) without pulling
  the registry. Anything on a plain page that reads the terminal VFS
  (`useBlogOverrides`) restores it from storage itself, since the terminal may
  never mount there.

- **Commands** are plain factories over a `TerminalContext`
  (`app/utils/terminal/types.ts`), grouped in per-domain modules under
  `app/utils/terminal/` and merged by three facades: `systemCommands`
  (shell/fileWrite/misc/info), `contentCommands` (site/browse/file),
  `funCommands` (game/toy/net/effect). Add a command to the matching module;
  `help` groups by the `category` field automatically.
- **Factory-time vs exec-time:** command factories run inside a component
  setup (valid Nuxt context) — capture `useRuntimeConfig()`, `useState`,
  other composables *there*. `exec()` runs from event handlers, outside the
  instance. The same rule applies everywhere: never call `useRuntimeConfig()`
  lazily inside a `computed` (unhead may evaluate it after the instance is
  gone; this once broke prerendering).
- **Beware recursion:** a composable used *inside* the command factories
  (e.g. `useTrash`) must not call `useTerminal()` — reach for the raw
  `useState(STATE_KEYS.…)` key instead.
- **Pure helpers** (`planRun`, `pipeline`, `chain`, `completion`,
  `filesystem`, `panes`, …) hold the parsing/decision logic so `tests/` can
  cover them without booting Nuxt.
- **Games/editors** implement `GameHandle` (`app/utils/games/types.ts`) and
  take over the keyboard via `ctx.startGame(create, name)` — the `name` puts
  them in the process table.

## One process table (`app/utils/terminal/effectProcs.ts`)

Effects, lvOS windows, the active game/editor and the shell itself are all
"processes" with stable pids. `ps`/`kill`/`top` in the terminal and the lvOS
task manager read the same table, so killing works from either side
(`kill 7` closes the terminal; the task manager can end a terminal game).
Window pids derive from the app registry's order; effect pids are fixed.

## Site-wide effects

A terminal command flips a `useState` flag (`fx-*` in `STATE_KEYS`); a
component mounted in `app/layouts/default.vue` watches it (`MatrixRain`,
`FireworksShow`, `BossScreen`, …). Register every effect in `effectProcs.ts`
so it's killable, give it a reduced-motion story, and gate heavy components
behind `v-if` + `Lazy`. Beating a game's personal best flips `fx-celebrate`
(`ScoreCelebration`); topping the global leaderboard #1 (`useLeaderboard`)
additionally flips `fx-world-record` for a bigger burst + `WorldRecordToast`.

## lvOS (`app/components/WebDesktop.vue` + `app/components/desktop/`)

A desktop on its own route (`/desktop`). `WebDesktop.vue` is the shell;
mechanics live in composables: `useWindowManager` (drag/resize/snap/z-order),
`useDesktopShortcuts` (the keyboard), `useDesktopPower` (lock/logout/CRT
power-off), `useWallpaper`, `useDesktopToasts`. Apps are lazy components in
`app/components/desktop/`, registered in `app/utils/desktopApps.ts` — that
one registry drives the icon grid, window titles, wide-window hints, the
Alt+R run dialog and process pids.

Crucially, lvOS shares the site's state: the Files app, vim window and
terminal edit the same virtual filesystem; the recycle bin catches `rm` from
everywhere; the pet in the status bar is the pet on the desktop.

## Realtime (the cursors relay, opt-in)

Every multiplayer feature rides one optional Node websocket relay
(`realtime/cursors-server.mjs`, enabled by `NUXT_PUBLIC_CURSORS_WS`). Each
subsystem follows one pattern: a shared pure `*-core.mjs` (rules, palette,
validation) imported by BOTH server and client so the server stays
authoritative and the client only predicts; a typed wire contract in
`realtime/protocol.d.ts`; and a client composable that leases the shared
`utils/relaySocket.ts` connection with a refcount so the socket opens on the
first consumer and closes when the last leaves. Ephemeral rooms (chat, the
co-draw whiteboard) keep a short ring buffer in server memory and replay it to
late joiners. Every subsystem degrades gracefully to solo/local when no relay
is configured, and `scripts/relay-check.mjs` (`npm run test:relay`) boots a
throwaway relay and asserts each protocol end-to-end. The co-draw whiteboard
(`draw-core.mjs` + `useCoDraw` + `DesktopCoDraw.vue`) is the simplest current
example of the whole pattern.

## Styling

Bulma v1 via `@use "bulma/sass" with (…)` in `app/assets/scss/global.scss`.
Dark/light keys off the `data-theme` attribute — style with
`var(--bulma-*)`/`hsla(var(--lv-*-hsl), …)` variables so both themes work.
Design language: monospace accents, corner brackets, amber `#ffba00`, prompt
glyphs. Respect `prefers-reduced-motion` in every animation — for JS/canvas
loops gate on the shared `prefersReducedMotion()` helper (`app/utils/reducedMotion.ts`),
which ORs the OS query with the manual "reduce motion" switch, not a raw
`matchMedia` call.

## Mobile & touch

The site is built to work with a thumb on a 375px screen. Two rules keep the
mobile work from disturbing the desktop (and the e2e suite, which runs at a
wide viewport with a fine pointer):

- **Gate touch behaviour behind the pointer, not the width alone.** Enlarged
  hit targets, d-pads and long-press menus live under
  `@media (pointer: coarse)` / `(hover: none)`; fixed-viewport layout swaps use
  `@media (max-width: …)` or a JS `window.innerWidth` check (e.g. windows
  open maximized when `innerWidth <= 640`). Because the e2e browser is a
  fine-pointer desktop, none of the coarse-gated changes affect it.
- **Touch has no right-click or hover.** Anything reachable only via
  `@contextmenu` or `:hover` needs a touch path: a ~500ms long-press that
  synthesises the menu (desktop background, file rows) or an on-screen toggle
  (Minesweeper's flag mode). Suppress the long-press's synthesised click with
  `preventDefault` on `touchend` so it can't dismiss what it just opened.

Fixed-width game boards (chess, minesweeper) size their cells with
`min(<base>, calc((100vw − margin) / <cols>))` so they shrink to fit a phone
window instead of overflowing it.

## Build & test

```
npm run lint / lint:styles         eslint (strict type-checked) + stylelint
npm run typecheck / :tests / :scripts
npm run test                       vitest over tests/ (pure logic, no Nuxt)
npm run generate                   static build (+ OG cards, resume PDF, git log baked in)
npm run test:e2e                   playwright against the served static build
```

Build-time extras hang off `generate`: `scripts/generate-og.mjs`
(pregenerate) writes one SVG card per page/post, `scripts/generate-resume.mjs`
(postgenerate) prints `/cv` to PDF over the shared `scripts/static-server.mjs`.
E2E helpers live in `e2e/helpers.ts` (`openTerminal`, `pressTerminalKey`,
`bootDesktop`) — use them; they absorb hydration races.

If a build ever "succeeds" but the site won't hydrate, check that
`.output/public/_nuxt/` exists — a prerender error aborts the copy and the
exit code is easy to mask behind a pipe.
