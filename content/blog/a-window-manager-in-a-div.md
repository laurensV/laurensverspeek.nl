---
title: 'a window manager in a div'
date: '2026-07-08'
description: 'dragging, snapping and alt-tab for lvOS — the fake desktop hiding in my portfolio — with one pointermove listener and a z-index counter.'
tags: ['typescript', 'vue', 'lvos']
---

Type `desktop` in [the terminal](/blog/rebuilding-this-site) and my site boots **lvOS**: a pretend operating system with draggable windows, a taskbar and a start menu. None of it is real. Every "window" is a `<div>`, and the whole window manager is about 150 lines of composable. Here's how it holds together.

## a window is just data

There is no window object, only a row in an array:

```ts
interface DesktopWindow {
  id: string
  title: string
  x: number
  y: number
  z: number
  width?: number
  height?: number
  minimized: boolean
  maximized: boolean
  // rect to restore after un-maximizing/un-snapping
  restore?: { x: number, y: number, width?: number, height?: number }
}
```

The template `v-for`s over the array and positions each window with an inline `style`. Rendering is Vue's problem; the composable only ever mutates numbers.

## focus is a z-index counter

"Bring to front" is the oldest trick in the book: keep a monotonic counter and hand the focused window the next value.

```ts
let zCounter = 10
const focusWindow = (win: DesktopWindow) => {
  win.z = ++zCounter
}
```

That single line also powers **alt-tab**. If focus is just "highest z", switching windows is sorting the open ones by `z` and bumping whichever comes next:

```ts
const cycleWindows = (dir = 1) => {
  const open = windows.value.filter((w) => !w.minimized)
  if (open.length < 2) return
  const byStack = [...open].sort((a, b) => a.z - b.z)
  const top = byStack.length - 1
  focusWindow(byStack[(top + dir + byStack.length) % byStack.length])
}
```

(Caveat: the OS usually eats real Alt+Tab before the page sees it. The taskbar stays the reliable switcher — this is a bonus for whoever's window manager doesn't grab it.)

## one listener drags every window

Each titlebar's `pointerdown` records which window is being dragged and the grab offset. Then a *single* window-level `pointermove` does the math for whichever window is currently active — no per-window listeners to add and tear down:

```ts
useEventListener('pointermove', (event) => {
  if (!dragging) return
  dragging.x = clamp(event.clientX - dragOffset.x, 0, innerWidth - 120)
  dragging.y = clamp(event.clientY - dragOffset.y, 0, innerHeight - 80)
  snapHint.value = edgeZone(event.clientX, event.clientY)
})
```

## snapping needs a ghost

Aero-snap has a secret: the preview. Drag a window to the edge and Windows shows a translucent rectangle of where it will land *before* you let go. Without it, snapping feels like the app twitching.

So `edgeZone()` returns `'left' | 'right' | 'top' | null` based on how close the pointer is to a screen edge, and a computed turns that into a rectangle:

```ts
const snapPreview = computed(() => {
  if (!snapHint.value) return null
  const half = Math.floor(innerWidth / 2)
  const height = innerHeight - TASKBAR_PX
  if (snapHint.value === 'left') return { x: 0, y: 0, width: half, height }
  if (snapHint.value === 'right') return { x: half, y: 0, width: half, height }
  return { x: 0, y: 0, width: innerWidth, height } // top → maximize
})
```

The desktop renders one ghost `<div>` at that rect with a CSS transition on `left/top/width/height`, so it glides as you slide along the edge. On `pointerup`, the same `edgeZone` decides whether to actually snap — the preview never lies, because it runs the exact function the drop does.

## the restore rect

Maximizing and snapping both need an undo. Before either, we stash the current geometry; restoring pops it back:

```ts
const toggleMaximize = (win) => {
  if (win.maximized) { win.maximized = false; restoreRect(win) }
  else { saveRestoreRect(win); win.maximized = true }
}
```

Dragging a maximized window "peels" it off under the cursor — clear `maximized`, restore the old size, re-centre it on the pointer, keep dragging. Little touches like that are the difference between "divs that move" and something that feels like a desktop.

None of this is load-bearing. It's a portfolio easter egg. But building a window manager is one of those exercises where the real thing turns out to be a surprisingly small pile of good ideas — a counter, an array, and one honest preview.
