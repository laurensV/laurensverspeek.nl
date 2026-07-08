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
// Conway's Game of Life as the hero centerpiece: a slow, toroidal cellular
// automaton drawn as dim amber cells. Drag to seed live cells; a plain click
// opens the full-page playground at /life. All the grid/canvas mechanics live
// in useLifeBoard — here we just add a soft paint brush and the click-to-open.

const containerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const colorMode = useColorMode()

const CELL = 12 // css px per cell

const painting = ref(false)

const { redraw, draw, setCell, dims } = useLifeBoard(canvasRef, containerRef, {
  cellSize: CELL,
  stepMs: 150,
  seedDensity: 0.16,
  draw: { alpha: 0.5 },
  autoReseed: true // ambient: never let the board die out
})

// paint live cells under the pointer (a soft brush), for the interactive part
const paintAt = (event: PointerEvent) => {
  const rect = containerRef.value?.getBoundingClientRect()
  const { cols, rows } = dims()
  if (!rect || !cols) return
  const cx = Math.floor((event.clientX - rect.left) / CELL)
  const cy = Math.floor((event.clientY - rect.top) / CELL)
  const r = painting.value ? 2 : 1
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (x >= 0 && x < cols && y >= 0 && y < rows && Math.random() < 0.7) setCell(x, y, 1)
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
