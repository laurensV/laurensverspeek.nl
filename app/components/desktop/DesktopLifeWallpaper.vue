<template>
  <canvas ref="canvasRef" class="lvos-live-wallpaper" aria-hidden="true" />
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { seedRandom, step, population } from '~/utils/gameOfLife'

// A dim Game of Life simmering behind the lvOS icons. Reduced motion gets a
// single static generation instead of the simulation.

const CELL = 22
const TICK_MS = 400
const SEED = 0.16

const canvasRef = ref<HTMLCanvasElement>()
let grid: Uint8Array
let cols = 0
let rows = 0
let timer: ReturnType<typeof setInterval> | undefined

const draw = () => {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(255, 186, 0, 0.07)'
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y * cols + x]) context.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4)
    }
  }
}

const seed = () => {
  grid = seedRandom(cols, rows, SEED)
}

const fit = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  cols = Math.ceil(canvas.width / CELL)
  rows = Math.ceil(canvas.height / CELL)
  seed()
  draw()
}

const tick = () => {
  grid = step(grid, cols, rows)
  // reseed a fizzled board so the wallpaper never goes still
  if (population(grid) < cols * rows * 0.02) seed()
  draw()
}

onMounted(() => {
  fit()
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    timer = setInterval(tick, TICK_MS)
  }
})
useEventListener('resize', fit)
onUnmounted(() => clearInterval(timer))
</script>

<style scoped lang="scss">
.lvos-live-wallpaper {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
