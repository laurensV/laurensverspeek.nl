---
title: 'putting a playable snake game in a fake terminal'
date: '2026-07-07'
description: 'a game loop, a <pre> tag, and stealing the keyboard from vue — no canvas required.'
tags: ['typescript', 'games', 'terminal']
---

My site has a [terminal](/blog/rebuilding-this-site) — so obviously it needed `snake`. The fun constraint: the "screen" is just a `<pre>` element in a Vue component. No canvas, no WebGL, just monospace text re-rendered 8 times per second.

## the game is a string factory

A game here is a function that receives two callbacks: one to draw a frame, one to report the final output when the game ends.

```ts
export interface GameCallbacks {
  onFrame(frame: string): void
  onEnd(lines: string[]): void
}
```

Every tick, snake builds the whole board as a string — box-drawing characters for the walls, `█` for the body, `●` for the food — and hands it to `onFrame`. Vue re-renders the `<pre>`, and because the font is monospace, the "pixels" line up perfectly:

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

## stealing the keyboard

The terminal normally routes keys to an `<input>`. While a game is active, the input is hidden and a window-level listener feeds keys to the game instead:

```ts
useEventListener('keydown', (event) => {
  if (!isOpen.value || !activeGame.value) return
  if (activeGame.value.onKey(event.key)) event.preventDefault()
})
```

The game returns `true` for keys it consumed, so arrows stop scrolling the page but `F5` still works. `q` and `Escape` end the game instead of closing the terminal — that one took a bug report from myself to get right.

## the segfault

When you die, the terminal prints:

```bash
game over — the snake has encountered a segfault
final score: 120
new high score! previous best: 80
```

High scores persist in `localStorage`, because if you're going to lose to a snake made of Unicode blocks, the least I can do is remember it.

Try it: press `~`, type `snake`. My high score is embarrassing, please beat it.
