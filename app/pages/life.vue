<template>
  <section class="life-page">
    <header class="life-bar is-family-code">
      <div class="life-head">
        <h1 class="overline mb-0">conway $ ./life</h1>
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
import { LIFE_PATTERNS, type LifePattern } from '~/utils/lifePatterns'

// full-viewport app page: the pwd breadcrumb strip would eat into the board
definePageMeta({ breadcrumb: false })

const ogImage = `${SITE_URL}/og/life.png`
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

// respect reduced motion: start paused so nothing moves until the visitor
// presses play or step (the loop is opt-in via alwaysAnimate in useLifeBoard)
const reducedMotion = usePreferredReducedMotion()
const running = ref(reducedMotion.value !== 'reduce')
const fps = ref(12)
const generation = ref(0)
const painting = ref(false)

const { pop, redraw, randomize, clear, place: placeCells, advance, paintAt } = useLifeBoard(canvasRef, wrapRef, {
  cellSize,
  stepMs: () => 1000 / fps.value,
  seedDensity: 0.18,
  alwaysAnimate: true,
  running,
  preserveOnResize: true,
  draw: { grid: true },
  onAdvance: () => generation.value++,
  onReset: () => (generation.value = 0)
})

const toggle = () => (running.value = !running.value)
const stepOnce = () => advance()
const clearBoard = () => {
  running.value = false
  clear()
}
const place = (pattern: LifePattern) => placeCells(pattern.cells)

// left/normal paints live cells; shift or right-button erases
let paintValue: 0 | 1 = 1
const onDown = (event: PointerEvent) => {
  painting.value = true
  paintValue = event.shiftKey || event.button === 2 ? 0 : 1
  paintAt(event, paintValue)
}
const onMove = (event: PointerEvent) => {
  if (painting.value) paintAt(event, paintValue)
}

// zoom the cell size; useLifeBoard refits (preserving the pattern) on redraw
const zoom = (delta: number) => {
  cellSize.value = Math.min(32, Math.max(8, cellSize.value + delta))
}
watch(cellSize, () => redraw())

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
  height: calc(100dvh - 3.25rem - 1.65rem); // dvh: no mobile URL-bar jump
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
  h1 {
    font-size: 0.85rem;
    font-weight: inherit;
  }

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
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-left: 0.5rem;
  border-left: 1px solid var(--bulma-border-weak);
}

// full-size control buttons on touch (this is a real content page, not an
// lvOS window, so it had no coarse-pointer sizing)
@media (pointer: coarse) {
  .life-btn {
    min-width: 2.4rem;
    min-height: 2.4rem;
  }
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
