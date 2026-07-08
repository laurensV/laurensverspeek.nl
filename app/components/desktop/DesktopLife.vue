<template>
  <div class="desktop-life is-family-code">
    <div class="dl-toolbar">
      <button class="dl-btn" :title="running ? 'Pause' : 'Play'" @click="running = !running">{{ running ? '⏸' : '▶' }}</button>
      <button class="dl-btn" title="Randomize" @click="randomize">⚄</button>
      <button class="dl-btn" title="Clear" @click="clearBoard">✕</button>
      <select class="dl-select" aria-label="Place a pattern" @change="onPattern">
        <option value="">pattern…</option>
        <option v-for="pattern in LIFE_PATTERNS" :key="pattern.name" :value="pattern.name">{{ pattern.name }}</option>
      </select>
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
import { usePreferredReducedMotion } from '@vueuse/core'
import { LIFE_PATTERNS } from '~/utils/lifePatterns'

// A compact Game of Life window for lvOS. All the grid/canvas mechanics live in
// useLifeBoard; this just wires the toolbar.
const CELL = 11

const wrapRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

const reducedMotion = usePreferredReducedMotion()
const running = ref(reducedMotion.value !== 'reduce')
const generation = ref(0)
const painting = ref(false)

const { pop, redraw, randomize, clear, place, paintAt } = useLifeBoard(canvasRef, wrapRef, {
  cellSize: CELL,
  stepMs: 130,
  seedDensity: 0.2,
  minDim: 6,
  alwaysAnimate: true,
  running,
  onAdvance: () => generation.value++,
  onReset: () => (generation.value = 0)
})

const clearBoard = () => {
  running.value = false
  clear()
}
const onPattern = (event: Event) => {
  const select = event.target as HTMLSelectElement
  const pattern = LIFE_PATTERNS.find((p) => p.name === select.value)
  if (pattern) place(pattern.cells)
  select.value = ''
}

const onDown = (event: PointerEvent) => {
  painting.value = true
  paintAt(event)
}
const onMove = (event: PointerEvent) => {
  if (painting.value) paintAt(event)
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

  .dl-select {
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--bulma-border-weak);
    border-radius: 2px;
    background: none;
    color: hsl(var(--lv-scheme-hs), 85%);
    font: inherit;
    font-size: 0.72rem;
    cursor: pointer;
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
