<template>
  <div
    ref="containerRef"
    class="hero-life"
    aria-hidden="true"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="painting = false"
    @pointerleave="painting = false"
  >
    <canvas ref="canvasRef" class="hero-life-canvas" />
  </div>
</template>

<script setup lang="ts">
import { usePreferredReducedMotion, useDocumentVisibility, useResizeObserver } from '@vueuse/core'

// Conway's Game of Life as the hero centerpiece: a slow, toroidal cellular
// automaton drawn as dim amber cells. Move or drag the pointer to seed live
// cells and watch them evolve. Pure 2D canvas + integer math — no libraries.

const containerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const colorMode = useColorMode()

const CELL = 12 // css px per cell
const STEP_MS = 150 // evolution tick
const SEED_DENSITY = 0.16

let ctx: CanvasRenderingContext2D | null = null
let cols = 0
let rows = 0
let grid = new Uint8Array(0)
let next = new Uint8Array(0)
let dpr = 1
let rafId = 0
let acc = 0
let last = 0

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
  grid = new Uint8Array(cols * rows)
  next = new Uint8Array(cols * rows)
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < SEED_DENSITY ? 1 : 0
}

const population = () => {
  let n = 0
  for (let i = 0; i < grid.length; i++) n += grid[i]!
  return n
}

const resize = () => {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = container.clientWidth
  const h = container.clientHeight
  cols = Math.max(8, Math.floor(w / CELL))
  rows = Math.max(8, Math.floor(h / CELL))
  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  seed()
  draw()
}

// one Conway step on a toroidal (wrapping) board
const step = () => {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = (x + dx + cols) % cols
          const ny = (y + dy + rows) % rows
          n += grid[idx(nx, ny)]!
        }
      }
      const alive = grid[idx(x, y)]!
      next[idx(x, y)] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0
    }
  }
  ;[grid, next] = [next, grid]
  // never let the board die out — reseed a soup if it gets too sparse
  if (population() < grid.length * 0.02) seed()
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

const loop = (t: number) => {
  const dt = t - last
  last = t
  acc += dt
  if (acc >= STEP_MS) {
    acc = 0
    step()
    draw()
  }
  rafId = requestAnimationFrame(loop)
}

const start = () => {
  cancelAnimationFrame(rafId)
  if (reducedMotion.value === 'reduce') {
    draw()
  } else if (visibility.value === 'visible') {
    last = performance.now()
    acc = 0
    rafId = requestAnimationFrame(loop)
  }
}

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

const onPointerDown = (event: PointerEvent) => {
  painting.value = true
  paintAt(event)
}
const onPointerMove = (event: PointerEvent) => paintAt(event)

onMounted(() => {
  readColor()
  resize()
  start()
})
onBeforeUnmount(() => cancelAnimationFrame(rafId))

useResizeObserver(containerRef, resize)
watch([visibility, reducedMotion], start)
watch(
  () => colorMode.value,
  async () => {
    await nextTick()
    readColor()
    draw()
  }
)
</script>

<style scoped>
.hero-life {
  width: 100%;
  height: 22rem;
  max-width: 26rem;
  margin-inline: auto;
  cursor: crosshair;
  touch-action: pan-y;
}

.hero-life-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
