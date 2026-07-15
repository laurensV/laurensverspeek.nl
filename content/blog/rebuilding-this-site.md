---
title: 'rebuilding my portfolio after 4 years of "coming soon(ish)"'
date: '2026-07-05'
description: 'from an unfinished nuxt 2 page to a nuxt 4 site with a terminal, a fake OS, a game of life engine that renders four different ways, and too many easter eggs.'
tags: ['nuxt', 'vue', 'typescript', 'meta']
---

For four years, my personal website consisted of a hero, six project cards, and the sentence *"My personal slice of the web is still under construction and will be live if I can find some time to finish it ;)"*.

I never found the time. So instead of finishing v1, I deleted it.

What replaced it is less a portfolio than a playground: a terminal you can actually use, a pretend operating system with draggable windows, Conway's Game of Life running in four places off one engine, and a service worker that can show you this site as it looked six months ago. This post is the tour, and the handful of ideas that kept all of it from collapsing under its own cuteness.

## the stack

The rebuild is [Nuxt 4](https://nuxt.com) + TypeScript + [Bulma 1](https://bulma.io), generated as a fully static site. Bulma might seem like an odd choice next to the utility-CSS crowd, but v1 moved everything to CSS variables, which makes theming almost free:

```scss
@use "bulma/sass" with (
  $family-primary: '"Inter", sans-serif',
  $family-code: '"JetBrains Mono", monospace',
  $primary: #ffba00
);
```

Dark mode is just `data-theme="dark"` on the `<html>` element — Bulma swaps every variable, and anything custom reads `var(--bulma-*)` so it follows along. Even the canvas animations read their colours from the CSS variables at runtime, which is why the amber cells in the hero know they're in dark mode.

Everything else follows from one constraint I set early: **the site must stay statically generated**. No runtime server, no API I have to keep alive. Anything dynamic is either client-side or an opt-in external service. That constraint turned out to be a feature — it forced most of the "backend" ideas below to become honest little client-side systems instead.

## the terminal

The gimmick I actually wanted to build: press `~` and you get a terminal. It's not an emulator — it's a Vue component and a composable with a command map:

```ts
const commands: Record<string, TerminalCommand> = {
  help:     { description: 'List available commands', exec: () => ... },
  projects: { description: 'List projects', exec: (args) => ... },
  cd:       { description: 'Go to a page', exec: (args) => navigate(args[0]) },
  // ...50 or so more
}
```

State lives in `useState`, so the navbar button, the footer link and the overlay all talk to the same terminal instance rather than three lookalikes. Commands can navigate the router, toggle the theme, fetch the GitHub API, or take over the keyboard entirely.

The rule that keeps it from being a toy: it reads the same data the pages do. `about` prints the same profile the `/about` page renders; `blog` lists the same posts the `/blog` index does. There's no second copy of me to drift out of date.

## a game is a string factory

Taking over the keyboard is how `snake` ended up in there. The fun constraint: the "screen" is just a `<pre>` element. No canvas, no WebGL — monospace text re-rendered eight times a second.

A game is a function handed two callbacks, one to draw a frame and one to report the final output:

```ts
export interface GameCallbacks {
  onFrame(frame: string): void
  onEnd(lines: string[]): void
}
```

Every tick, snake builds the entire board as a string — box-drawing characters for the walls, `█` for the body, `●` for the food — and hands it over. Because the font is monospace, the "pixels" line up:

```ts
function render() {
  const grid = buildGrid()          // 26 × 12 characters
  grid[food.y][food.x] = '●'
  snake.forEach((cell, i) => {
    grid[cell.y][cell.x] = i === 0 ? '▓' : '█'
  })
  onFrame(header + grid.map((row) => row.join(' ')).join('\n'))
}
```

Diffing a full-frame string sounds wasteful, but the frame is ~700 characters. The DOM update is nothing; your GPU yawns.

Stealing the keyboard is the other half. The terminal normally routes keys to an `<input>`; while a game is active, the input is hidden and a window-level listener feeds keys to the game:

```ts
useEventListener('keydown', (event) => {
  if (!isOpen.value || !activeGame.value) return
  if (activeGame.value.onKey(event.key)) event.preventDefault()
})
```

The game returns `true` for keys it consumed, so arrows stop scrolling the page but `F5` still works, and `q` ends the game rather than closing the terminal. That last one took a bug report from myself to get right.

## a window manager in a div

Type `desktop` and the site boots **lvOS**: a pretend operating system with draggable windows, a taskbar and a start menu. None of it is real. Every "window" is a `<div>`, and the window manager is about 150 lines.

There is no window object, only a row in an array:

```ts
interface DesktopWindow {
  id: string
  title: string
  x: number
  y: number
  z: number
  minimized: boolean
  maximized: boolean
  // rect to restore after un-maximizing/un-snapping
  restore?: { x: number, y: number, width?: number, height?: number }
}
```

The template `v-for`s over the array and positions each window with an inline style. Rendering is Vue's problem; the composable only ever mutates numbers.

"Bring to front" is the oldest trick in the book — a monotonic counter:

```ts
let zCounter = 10
const focusWindow = (win: DesktopWindow) => {
  win.z = ++zCounter
}
```

That single line also powers alt-tab. If focus is just "highest z", then switching windows is sorting the open ones by `z` and bumping whichever comes next. One idea, two features.

Dragging is one window-level `pointermove` doing the math for whichever window is active — no per-window listeners to add and tear down. And snapping needs a ghost: aero-snap's secret is the preview, the translucent rectangle showing where the window will land *before* you let go. Without it, snapping feels like the app twitching. So `edgeZone()` returns `'left' | 'right' | 'top' | null`, a computed turns that into a rect, and one ghost `<div>` glides to it. On `pointerup`, the same `edgeZone` decides where the window actually goes — the preview never lies, because it runs the exact function the drop does.

## the overlay that had to become a route

lvOS started as an *overlay*: a `useState` flag flipped to `true` and a `position: fixed` div slammed over the page at `z-index: 95`. It worked, and it had two tells.

The first was a dead scrollbar. The overlay covered the viewport, but the page underneath was still there — hero, footer, all of it, taller than the screen. So the browser still showed a scrollbar. You could scroll a page you couldn't see, behind an OS that didn't move.

The honest fix isn't "hide the scrollbar". It's to stop having a tall page behind the desktop at all — which means the desktop shouldn't be an overlay *on* a page, it should *be* the page. So lvOS moved to a real route, `/desktop`, with a bare layout that renders nothing else and an `is-lvos` class on `<html>` that locks scrolling for good. Scrollbar gone, because there is genuinely nothing to scroll.

The nicer part is what disappeared. The old model needed a global flag, a plugin to read `?desktop` from the query string, a watcher to lazy-mount the component, and `desktopActive.value = false` sprinkled through every "log out" and "open this project" handler. All of it existed to fake navigation. Once `/desktop` is a route, navigation is just navigation:

```ts
const logout = () => router.push('/')
const openProject = (slug: string) => router.push(`/projects/${slug}`)
```

A whole piece of shared state evaporated, replaced by the router — which was always the right tool for "show a different screen". An overlay is a screen you're *pretending* is on top; the moment the thing underneath can still scroll, or someone wants to link to it, the seams show.

## one Game of Life, four places

The centrepiece on the [home page](/) is Conway's Game of Life — a field of amber cells you can draw into, and click to open [full-screen](/life). It also runs as an ASCII toy in the terminal (`life`) and as a window inside lvOS. Four surfaces, one engine.

The trick isn't cleverness. It's *refusing to mix the rules with the pixels*. The simulation knows nothing about drawing, DOM or Vue — it's a `Uint8Array` and one function:

```ts {8,9}
export function step(grid: Grid, cols: number, rows: number, next = new Uint8Array(grid.length)): Grid {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = (x + dx + cols) % cols   // wrap: a toroidal board
          const ny = (y + dy + rows) % rows
          n += grid[ny * cols + nx]!
        }
      }
      const alive = grid[y * cols + x]!
      next[y * cols + x] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0
    }
  }
  return next
}
```

Because it's pure, it's *testable* — a blinker oscillates with period two, a block stays put, a lone cell dies. Those are unit tests, not something I eyeball in the browser.

The bulky, boring half — sizing the canvas to its container, scaling for device pixel ratio, pausing when the tab is hidden or the visitor prefers reduced motion, cleaning up on unmount — lives once, in a `useCanvasScene` composable. The hero and the `/life` page hand it different `onFrame` callbacks; neither reimplements the animation loop. The ASCII version skips the composable entirely, because its canvas is a `<pre>`.

The payoff: when I wanted Life in a fourth place, it was an afternoon, not a project. No rules were rewritten, so no rules could drift.

That shape kept showing up across the whole rebuild. The *interesting* part is usually tiny and pure; the *bulky* part is boring and shared. Keep them apart and the same idea renders anywhere you point it.

## a time machine, sort of

The newest piece is the one I'm most fond of. The site deploys to GitHub Pages, which means every past build still exists in the `gh-pages` branch history — and a public repo means a CDN will happily serve any of them. So there's a service worker that intercepts navigations and rewrites them to fetch a *past* deploy instead of the current one.

Type `git checkout v1.4.0` in the terminal and the site becomes itself, six months ago, in place. It's reachable four ways off one manifest — the lvOS app, the terminal, the ⌘K palette, and a shareable `/?v=<version>` link that travels on load — but there's only one `useTimeMachine` behind all four.

That's also the ruling principle for the PWA. There is exactly **one** service worker: Workbox precaches the build (including the Nuxt Content SQLite wasm, so content queries work offline) and `importScripts` the time-machine worker into it. Two registrations fighting over the same scope is a bug that only shows up on someone else's phone, three weeks later.

## the easter eggs

I won't list them all — run `secrets`, or visit the `/museum`, which catalogues every feature as an exhibit. The rule I set myself: every easter egg has to be discoverable from a hint somewhere else. The console hints at the terminal, the terminal hints at the hidden commands, the hidden commands hint at… you get it.

If you find one that isn't hinted at anywhere, that's a bug. Or is it?
