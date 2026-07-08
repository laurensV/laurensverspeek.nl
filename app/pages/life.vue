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
        <span class="life-presets">
          <button v-for="preset in PRESETS" :key="preset.name" class="life-btn" @click="place(preset)">{{ preset.name }}</button>
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
      />
      <p class="life-hint is-family-code">click &amp; drag to draw cells</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { createGrid, seedRandom, step as lifeStep, population, index, type Grid } from '~/utils/gameOfLife'

useHead({ title: "Conway's Game of Life — Laurens Verspeek" })
useSeoMeta({ description: "A full-page, playable Conway's Game of Life — draw cells and watch them evolve." })

const CELL = 16

const wrapRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

let ctx: CanvasRenderingContext2D | null = null
let cols = 0
let rows = 0
let grid: Grid = new Uint8Array(0)
let next: Grid = new Uint8Array(0)

const running = ref(true)
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
  ctx.clearRect(0, 0, cols * CELL, rows * CELL)
  // faint grid
  ctx.strokeStyle = `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.06)`
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= cols; x++) { ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, rows * CELL) }
  for (let y = 0; y <= rows; y++) { ctx.moveTo(0, y * CELL); ctx.lineTo(cols * CELL, y * CELL) }
  ctx.stroke()
  // live cells
  ctx.fillStyle = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
  const size = CELL - 2
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[index(cols, x, y)]) ctx.fillRect(x * CELL + 1, y * CELL + 1, size, size)
    }
  }
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
    cols = Math.max(8, Math.floor(w / CELL))
    rows = Math.max(8, Math.floor(h / CELL))
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
})

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
    x: Math.floor((event.clientX - rect.left) / CELL),
    y: Math.floor((event.clientY - rect.top) / CELL)
  }
}
const paint = (event: PointerEvent) => {
  const cell = cellAt(event)
  if (!cell || cell.x < 0 || cell.x >= cols || cell.y < 0 || cell.y >= rows) return
  grid[index(cols, cell.x, cell.y)] = 1
  draw()
}
const onDown = (event: PointerEvent) => {
  painting.value = true
  paint(event)
}
const onMove = (event: PointerEvent) => {
  if (painting.value) paint(event)
}

// ---- patterns (placed centred) ----
interface Preset { name: string, cells: [number, number][] }
const PRESETS: Preset[] = [
  { name: 'glider', cells: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]] },
  {
    name: 'pulsar',
    cells: (() => {
      const base = [2, 3, 4, 8, 9, 10]
      const out: [number, number][] = []
      for (const y of [0, 5, 7, 12]) for (const x of base) out.push([x, y])
      for (const x of [0, 5, 7, 12]) for (const y of base) out.push([x, y])
      return out
    })()
  },
  {
    name: 'gosper gun',
    cells: [
      [0, 4], [0, 5], [1, 4], [1, 5],
      [10, 4], [10, 5], [10, 6], [11, 3], [11, 7], [12, 2], [12, 8], [13, 2], [13, 8], [14, 5],
      [15, 3], [15, 7], [16, 4], [16, 5], [16, 6], [17, 5],
      [20, 2], [20, 3], [20, 4], [21, 2], [21, 3], [21, 4], [22, 1], [22, 5], [24, 0], [24, 1], [24, 5], [24, 6],
      [34, 2], [34, 3], [35, 2], [35, 3]
    ]
  }
]
const place = (preset: Preset) => {
  grid = createGrid(cols, rows)
  next = createGrid(cols, rows)
  const maxX = Math.max(...preset.cells.map((c) => c[0]))
  const maxY = Math.max(...preset.cells.map((c) => c[1]))
  const ox = Math.floor((cols - maxX) / 2)
  const oy = Math.floor((rows - maxY) / 2)
  for (const [x, y] of preset.cells) {
    const gx = ox + x
    const gy = oy + y
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) grid[index(cols, gx, gy)] = 1
  }
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
