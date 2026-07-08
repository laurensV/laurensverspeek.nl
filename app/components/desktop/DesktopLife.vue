<template>
  <div class="desktop-life is-family-code">
    <div class="dl-toolbar">
      <button class="dl-btn" :title="running ? 'Pause' : 'Play'" @click="running = !running">{{ running ? '⏸' : '▶' }}</button>
      <button class="dl-btn" title="Randomize" @click="randomize">⚄</button>
      <button class="dl-btn" title="Clear" @click="clearBoard">✕</button>
      <span class="dl-stat">gen {{ generation }} · {{ pop }}</span>
    </div>
    <div ref="wrapRef" class="dl-stage">
      <canvas
        ref="canvasRef"
        class="dl-canvas"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="painting = false"
        @pointerleave="painting = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { createGrid, seedRandom, step as lifeStep, population, index, type Grid } from '~/utils/gameOfLife'

// A compact Game of Life window for lvOS. Reuses the shared engine and the
// useCanvasScene canvas lifecycle, so it stays tiny.
const CELL = 11

const wrapRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

let ctx: CanvasRenderingContext2D | null = null
let cols = 0
let rows = 0
let grid: Grid = new Uint8Array(0)
let next: Grid = new Uint8Array(0)
let acc = 0

const running = ref(true)
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

const { redraw } = useCanvasScene(canvasRef, wrapRef, {
  onResize: (context, w, h) => {
    ctx = context
    const nextCols = Math.max(6, Math.floor(w / CELL))
    const nextRows = Math.max(6, Math.floor(h / CELL))
    if (nextCols !== cols || nextRows !== rows) {
      cols = nextCols
      rows = nextRows
      grid = seedRandom(cols, rows, 0.2)
      next = createGrid(cols, rows)
    }
    readColor()
    draw()
  },
  onFrame: (context, dt) => {
    ctx = context
    if (!running.value) return
    acc += dt
    if (acc >= 130) {
      acc = 0
      advance()
    }
  }
})

const randomize = () => {
  grid = seedRandom(cols, rows, 0.2)
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

const paint = (event: PointerEvent) => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  const x = Math.floor((event.clientX - rect.left) / CELL)
  const y = Math.floor((event.clientY - rect.top) / CELL)
  if (x >= 0 && x < cols && y >= 0 && y < rows) {
    grid[index(cols, x, y)] = 1
    draw()
  }
}
const onDown = (event: PointerEvent) => {
  painting.value = true
  paint(event)
}
const onMove = (event: PointerEvent) => {
  if (painting.value) paint(event)
}

watch(useColorMode(), async () => {
  await nextTick()
  redraw()
})
</script>

<style scoped lang="scss">
.desktop-life {
  display: flex;
  flex-direction: column;
  height: 22rem;
  min-height: 14rem;
}

.dl-toolbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-bottom: 0.5rem;

  .dl-btn {
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--bulma-border-weak);
    border-radius: 2px;
    background: none;
    color: hsl(var(--lv-scheme-hs), 85%);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;

    &:hover {
      border-color: hsla(var(--lv-primary-hsl), 0.5);
      color: var(--bulma-primary);
    }
  }

  .dl-stat {
    margin-left: auto;
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.7rem;
  }
}

.dl-stage {
  flex: 1;
  overflow: hidden;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.2);
  border-radius: 2px;
  background-color: hsl(var(--lv-scheme-hs), 6%);
}

.dl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}
</style>
