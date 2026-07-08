---
title: 'one Game of Life, four places'
date: '2026-07-08'
description: 'the hero, a full page, an ASCII terminal toy and a desktop window all run the same 30-line Conway engine. a small lesson in keeping the rules pure.'
tags: ['typescript', 'canvas', 'games']
---

The centerpiece on my [home page](/) is Conway's Game of Life — a field of amber cells quietly evolving, that you can draw into and click to open [full-screen](/life). It also runs as an ASCII toy in the [terminal](/blog/rebuilding-this-site) (`life`) and as a window inside [lvOS](/blog/a-window-manager-in-a-div). Four surfaces, one engine.

The trick to that isn't cleverness — it's *refusing to mix the rules with the pixels*.

## the rules are 30 lines and no canvas

The simulation knows nothing about drawing, DOM, or Vue. It's a `Uint8Array` and one function:

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

Because it's pure, it's *testable* — a blinker oscillates with period two, a block stays put, a lone cell dies. Those are unit tests, not something I eyeball in the browser:

```ts
it('oscillates a blinker with period 2', () => {
  const gen1 = step(horizontal, 5, 5)
  expect([...gen1]).toEqual([...vertical])
  expect([...step(gen1, 5, 5)]).toEqual([...horizontal])
})
```

The board wraps at the edges (`% cols`), which is why gliders sail off one side and reappear on the other instead of dying in a corner.

## the canvas boilerplate is a composable

Every on-screen version needs the same tedious ceremony: size the canvas to its container, scale for the device pixel ratio, pause the loop when the tab is hidden or the visitor prefers reduced motion, and clean up on unmount. That's `useCanvasScene`:

```ts
const { redraw } = useCanvasScene(canvasRef, containerRef, {
  onResize: (ctx, w, h) => { /* size the grid, seed, draw one frame */ },
  onFrame:  (ctx, dt)   => { acc += dt; if (acc >= STEP_MS) { acc = 0; advance() } }
})
```

The hero and the `/life` page hand it different `onFrame` callbacks — the hero ticks on a fixed interval, the page paces itself off a speed slider — but neither re-implements resize or the animation loop. The ASCII terminal version skips the composable entirely; its "canvas" is a `<pre>`, so it just joins `█` and space into strings.

## the payoff

When I wanted Life in a fourth place — a draggable lvOS window — it was an afternoon, not a project. Import the engine, hand `useCanvasScene` a draw function, add three buttons. No rules were rewritten, so no rules could drift out of sync between the hero and the window.

The general shape keeps showing up: the *interesting* part (Conway's four rules) is tiny and pure; the *bulky* part (canvas lifecycles) is boring and shared. Keep those two apart and the same idea renders anywhere you point it — even at a `<pre>`.
