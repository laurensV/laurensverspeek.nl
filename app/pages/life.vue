<template>
  <section class="life-page">
    <header class="life-bar is-family-code">
      <div class="life-head">
        <p class="overline mb-0">conway $ ./life</p>
        <p class="life-stat">gen {{ generation }} · {{ pop }} cells</p>
      </div>

      <div class="life-controls">
        <button class="life-btn is-primary" @click="toggle">{{ running ? '⏸ pause' : '▶ play' }}</button>
        <button class="life-btn" :disabled="running" @click="stepOnce">⏭ step</button>
        <button class="life-btn" @click="randomize">⚄ random</button>
        <button class="life-btn" @click="clearBoard">✕ clear</button>
        <label class="life-speed">
          speed
          <input v-model.number="fps" type="range" min="1" max="30" aria-label="Speed">
        </label>
        <span class="life-zoom">
          zoom
          <button class="life-btn" :disabled="cellSize <= 8" aria-label="Zoom out" @click="zoom(-2)">−</button>
          <button class="life-btn" :disabled="cellSize >= 32" aria-label="Zoom in" @click="zoom(2)">+</button>
        </span>
        <span class="life-presets">
          <button v-for="pattern in LIFE_PATTERNS" :key="pattern.name" class="life-btn" @click="place(pattern)">{{ pattern.name }}</button>
        </span>
      </div>
    </header>

    <div ref="wrapRef" class="life-stage">
      <canvas
        ref="canvasRef"
        class="life-canvas"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="painting = false"
        @pointerleave="painting = false"
        @contextmenu.prevent
      />
      <p class="life-hint is-family-code">
        <template v-if="reducedMotion === 'reduce'">reduced motion — press ▶ play or ⏭ step · </template>drag to draw · shift or right-click to erase
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { createGrid, seedRandom, step as lifeStep, population, index, type Grid } from '~/utils/gameOfLife'
import { LIFE_PATTERNS, placePattern, type LifePattern } from '~/utils/lifePatterns'
import { drawGrid } from '~/utils/drawLife'

const ogImage = `${SITE_URL}/og/life.svg`
useHead({ title: "Conway's Game of Life — Laurens Verspeek" })
useSeoMeta({
  description: "A full-page, playable Conway's Game of Life — draw cells and watch them evolve.",
  ogTitle: "Conway's Game of Life",
  ogDescription: "A full-page, playable cellular automaton — draw cells and watch them evolve.",
  ogUrl: `${SITE_URL}/life`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})

const cellSize = ref(16) // px per cell; the zoom control changes this

const wrapRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

let ctx: CanvasRenderingContext2D | null = null
let cols = 0
let rows = 0
let grid: Grid = new Uint8Array(0)
let next: Grid = new Uint8Array(0)

// respect reduced motion: start paused so nothing moves until the visitor
// presses play or step (the loop itself is opt-in via alwaysAnimate below)
const reducedMotion = usePreferredReducedMotion()
const running = ref(reducedMotion.value !== 'reduce')
const fps = ref(12)
const generation = ref(0)
const pop = ref(0)
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

const draw = () => {
  if (!ctx) return
  drawGrid(ctx, grid, cols, rows, { cell: cellSize.value, hue: hsl.h, sat: hsl.s, light: hsl.l, grid: true })
  pop.value = population(grid)
}

const advance = () => {
  lifeStep(grid, cols, rows, next)
  ;[grid, next] = [next, grid]
  generation.value++
  draw()
}

// ---- canvas lifecycle + fps-paced run loop ----
let acc = 0
const { redraw } = useCanvasScene(canvasRef, wrapRef, {
  onResize: (context, w, h) => {
    ctx = context
    const oldGrid = grid
    const oldCols = cols
    cols = Math.max(8, Math.floor(w / cellSize.value))
    rows = Math.max(8, Math.floor(h / cellSize.value))
    if (!oldGrid.length) {
      grid = seedRandom(cols, rows, 0.18)
    } else {
      // preserve the pattern by copying the overlapping region (2D-aware)
      grid = createGrid(cols, rows)
      const oldRows = oldGrid.length / oldCols
      for (let y = 0; y < Math.min(rows, oldRows); y++) {
        for (let x = 0; x < Math.min(cols, oldCols); x++) {
          grid[index(cols, x, y)] = oldGrid[y * oldCols + x]!
        }
      }
    }
    next = createGrid(cols, rows)
    readColor()
    draw()
  },
  onFrame: (context, dt) => {
    ctx = context
    if (!running.value) return
    acc += dt
    if (acc >= 1000 / fps.value) {
      acc = 0
      advance()
    }
  }
}, { alwaysAnimate: true })

const toggle = () => (running.value = !running.value)
const stepOnce = () => advance()
const randomize = () => {
  grid = seedRandom(cols, rows, 0.18)
  next = createGrid(cols, rows)
  generation.value = 0
  draw()
}
const clearBoard = () => {
  grid = createGrid(cols, rows)
  next = createGrid(cols, rows)
  generation.value = 0
  running.value = false
  draw()
}

// ---- painting ----
const cellAt = (event: PointerEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return null
  return {
    x: Math.floor((event.clientX - rect.left) / cellSize.value),
    y: Math.floor((event.clientY - rect.top) / cellSize.value)
  }
}
// left/normal paints live cells; shift or right-button erases
let paintValue: 0 | 1 = 1
const paint = (event: PointerEvent) => {
  const pos = cellAt(event)
  if (!pos || pos.x < 0 || pos.x >= cols || pos.y < 0 || pos.y >= rows) return
  grid[index(cols, pos.x, pos.y)] = paintValue
  draw()
}
const onDown = (event: PointerEvent) => {
  painting.value = true
  paintValue = event.shiftKey || event.button === 2 ? 0 : 1
  paint(event)
}
const onMove = (event: PointerEvent) => {
  if (painting.value) paint(event)
}

// zoom the cell size; useCanvasScene refits (recomputes the grid) on redraw
const zoom = (delta: number) => {
  cellSize.value = Math.min(32, Math.max(8, cellSize.value + delta))
}
watch(cellSize, () => redraw())

// ---- patterns (placed centred) ----
const place = (pattern: LifePattern) => {
  grid = placePattern(cols, rows, pattern.cells)
  next = createGrid(cols, rows)
  generation.value = 0
  draw()
}

// re-read the accent and repaint on theme change (dims unchanged, no reseed)
watch(useColorMode(), async () => {
  await nextTick()
  redraw()
})
</script>

<style scoped lang="scss">
.life-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 3.25rem - 1.65rem); // viewport minus navbar and status bar
  min-height: 30rem;
}

.life-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--bulma-border-weak);
}

.life-head {
  .life-stat {
    color: var(--bulma-text-weak);
    font-size: 0.75rem;
  }
}

.life-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.life-btn {
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  background: none;
  color: var(--bulma-text);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;

  &:hover:not(:disabled) {
    border-color: hsla(var(--lv-primary-hsl), 0.5);
    color: var(--bulma-primary-on-scheme);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &.is-primary {
    border-color: hsla(var(--lv-primary-hsl), 0.5);
    color: var(--bulma-primary-on-scheme);
    background-color: hsla(var(--lv-primary-hsl), 0.1);
  }
}

.life-speed {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--bulma-text-weak);
  font-size: 0.75rem;

  input {
    accent-color: var(--bulma-primary);
  }
}

.life-zoom {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--bulma-text-weak);
  font-size: 0.75rem;
}

.life-presets {
  display: inline-flex;
  gap: 0.4rem;
  padding-left: 0.5rem;
  border-left: 1px solid var(--bulma-border-weak);
}

.life-stage {
  position: relative;
  flex: 1;
  overflow: hidden;
  background-color: var(--bulma-scheme-main-bis);
}

.life-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.life-hint {
  position: absolute;
  bottom: 0.6rem;
  right: 0.8rem;
  color: var(--bulma-text-weak);
  font-size: 0.72rem;
  pointer-events: none;
}
</style>
