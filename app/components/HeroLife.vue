<template>
  <div
    ref="containerRef"
    class="hero-life"
    role="button"
    tabindex="0"
    aria-label="Open Conway's Game of Life"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="painting = false"
    @keydown.enter="openFull"
    @keydown.space.prevent="openFull"
  >
    <canvas ref="canvasRef" class="hero-life-canvas" aria-hidden="true" />
    <span class="hero-life-hint is-family-code" aria-hidden="true">▶ play</span>
  </div>
</template>

<script setup lang="ts">
import { seedRandom, step as lifeStep, population, type Grid } from '~/utils/gameOfLife'

// Conway's Game of Life as the hero centerpiece: a slow, toroidal cellular
// automaton drawn as dim amber cells. Drag to seed live cells; a plain click
// opens the full-page playground at /life. The simulation lives in the shared,
// unit-tested ~/utils/gameOfLife; the canvas lifecycle in useCanvasScene.

const containerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const colorMode = useColorMode()

const CELL = 12 // css px per cell
const STEP_MS = 150 // evolution tick
const SEED_DENSITY = 0.16

let ctx: CanvasRenderingContext2D | null = null
let cols = 0
let rows = 0
let grid: Grid = new Uint8Array(0)
let next: Grid = new Uint8Array(0)
let acc = 0

const painting = ref(false)

let hsl = { h: 45, s: 100, l: 50 }
const readColor = () => {
  const style = getComputedStyle(document.documentElement)
  hsl = {
    h: parseFloat(style.getPropertyValue('--bulma-primary-h')) || 45,
    s: parseFloat(style.getPropertyValue('--bulma-primary-s')) || 100,
    l: parseFloat(style.getPropertyValue('--bulma-primary-l')) || 50
  }
}

const idx = (x: number, y: number) => y * cols + x

const seed = () => {
  grid = seedRandom(cols, rows, SEED_DENSITY)
  next = new Uint8Array(grid.length)
}

const step = () => {
  lifeStep(grid, cols, rows, next)
  ;[grid, next] = [next, grid]
  // never let the board die out — reseed a soup if it gets too sparse
  if (population(grid) < grid.length * 0.02) seed()
}

const draw = () => {
  if (!ctx) return
  ctx.clearRect(0, 0, cols * CELL, rows * CELL)
  ctx.fillStyle = `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.5)`
  const size = CELL - 2
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[idx(x, y)]) ctx.fillRect(x * CELL + 1, y * CELL + 1, size, size)
    }
  }
}

const { redraw } = useCanvasScene(canvasRef, containerRef, {
  onResize: (context, w, h) => {
    ctx = context
    const nextCols = Math.max(8, Math.floor(w / CELL))
    const nextRows = Math.max(8, Math.floor(h / CELL))
    if (nextCols !== cols || nextRows !== rows) {
      cols = nextCols
      rows = nextRows
      seed()
    }
    readColor()
    draw()
  },
  onFrame: (context, dt) => {
    ctx = context
    acc += dt
    if (acc >= STEP_MS) {
      acc = 0
      step()
      draw()
    }
  }
})

// paint live cells under the pointer (a small brush), for the interactive part
const paintAt = (event: PointerEvent) => {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect || !grid.length) return
  const cx = Math.floor((event.clientX - rect.left) / CELL)
  const cy = Math.floor((event.clientY - rect.top) / CELL)
  const r = painting.value ? 2 : 1
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (x >= 0 && x < cols && y >= 0 && y < rows && Math.random() < 0.7) grid[idx(x, y)] = 1
    }
  }
  draw()
}

// a plain click (little movement) opens the full-page playground; a drag paints
let downX = 0
let downY = 0
const openFull = () => navigateTo('/life')
const onPointerDown = (event: PointerEvent) => {
  painting.value = true
  downX = event.clientX
  downY = event.clientY
  paintAt(event)
}
const onPointerMove = (event: PointerEvent) => paintAt(event)
const onPointerUp = (event: PointerEvent) => {
  const tapped = Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) < 8
  painting.value = false
  if (tapped) openFull()
}

// re-read the accent + repaint when the theme flips (no reseed, dims unchanged)
watch(
  () => colorMode.value,
  async () => {
    await nextTick()
    redraw()
  }
)
</script>

<style scoped lang="scss">
.hero-life {
  position: relative;
  width: 100%;
  height: 22rem;
  max-width: 26rem;
  margin-inline: auto;
  cursor: pointer;
  touch-action: pan-y;
}

.hero-life-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

// a quiet "play" hint that fades in on hover/focus
.hero-life-hint {
  position: absolute;
  bottom: 0.4rem;
  right: 0.6rem;
  padding: 0.1rem 0.4rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: 2px;
  background: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-l), 0.7);
  color: var(--bulma-primary-on-scheme);
  font-size: 0.7rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.hero-life:hover .hero-life-hint,
.hero-life:focus-visible .hero-life-hint {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .hero-life-hint {
    transition: none;
  }
}
</style>
