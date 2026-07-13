<template>
  <div class="codraw is-family-code">
    <div class="codraw-head">
      <span>whiteboard</span>
      <span class="codraw-online">{{ statusLabel }}</span>
    </div>

    <canvas
      ref="canvasRef"
      class="codraw-canvas"
      aria-label="Shared drawing canvas"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onUp"
    />

    <div class="codraw-tools">
      <div class="codraw-pens" role="group" aria-label="Pen colour">
        <button
          v-for="(color, i) in COLORS"
          :key="i"
          class="codraw-pen"
          :class="{ 'is-active': pen === i }"
          :style="{ '--pen': color }"
          :title="i === 0 ? 'eraser' : `pen ${i}`"
          :aria-label="i === 0 ? 'eraser' : `pen colour ${i}`"
          :aria-pressed="pen === i"
          @click="pen = i"
        />
      </div>
      <button class="codraw-clear" title="Clear the board for everyone" @click="clear">clear</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import type { DrawStroke } from '../../../realtime/protocol'
import { DRAW_COLORS } from '../../../realtime/draw-core.mjs'

// The lvOS face of the co-draw whiteboard. Same shared board as the terminal
// `draw` command (useCoDraw's shared state + relay lease); freehand segments in
// normalized 0..1 space so every window/screen renders the same drawing at any
// size. Works solo (local only) when no relay is configured.

const COLORS = DRAW_COLORS
const { enabled, strokes, online, status, join, addStroke, clear } = useCoDraw()

const canvasRef = ref<HTMLCanvasElement>()
const pen = ref(2) // the amber pen by default

const statusLabel = computed(() => {
  if (!enabled.value) return 'solo — no relay'
  if (status.value === 'open') return `${online.value} drawing`
  if (status.value === 'lost') return 'connection lost'
  return 'connecting…'
})

let dpr = 1

const redraw = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.fillStyle = COLORS[0]!
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of strokes.value) {
    ctx.strokeStyle = COLORS[s.c] ?? COLORS[1]!
    // the eraser (index 0, board colour) draws fatter so it clears cleanly
    ctx.lineWidth = (s.c === 0 ? 16 : 3) * dpr
    ctx.beginPath()
    ctx.moveTo(s.x0 * canvas.width, s.y0 * canvas.height)
    ctx.lineTo(s.x1 * canvas.width, s.y1 * canvas.height)
    ctx.stroke()
  }
}

const fit = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.max(1, Math.round(rect.width * dpr))
  canvas.height = Math.max(1, Math.round(rect.height * dpr))
  redraw()
}

// a segment's endpoints are a fraction of the canvas, so the board looks the
// same at any window size
const posOf = (event: PointerEvent): { x: number, y: number } | null => {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  }
}

let last: { x: number, y: number } | null = null

const onDown = (event: PointerEvent) => {
  const p = posOf(event)
  if (!p) return
  last = p
  canvasRef.value?.setPointerCapture(event.pointerId)
  // a tap leaves a dot: a zero-length segment
  addStroke({ x0: p.x, y0: p.y, x1: p.x, y1: p.y, c: pen.value } satisfies DrawStroke)
}

const onMove = (event: PointerEvent) => {
  if (!last) return
  const p = posOf(event)
  if (!p) return
  addStroke({ x0: last.x, y0: last.y, x1: p.x, y1: p.y, c: pen.value } satisfies DrawStroke)
  last = p
}

const onUp = (event: PointerEvent) => {
  last = null
  if (canvasRef.value?.hasPointerCapture(event.pointerId)) {
    canvasRef.value.releasePointerCapture(event.pointerId)
  }
}

let release: (() => void) | undefined
onMounted(() => {
  release = join()
  fit()
})
onUnmounted(() => release?.())

// remote strokes / init / clear all replace the array — repaint on any change,
// and refit when the window is resized
watch(strokes, redraw)
useResizeObserver(canvasRef, fit)
</script>

<style scoped lang="scss">
.codraw {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(30rem, 100%);
  height: 100%;
  min-height: 0;
  font-size: 0.75rem;
}

.codraw-head {
  display: flex;
  justify-content: space-between;
  color: hsl(var(--lv-scheme-hs), 80%);
}

.codraw-online {
  color: hsl(var(--lv-scheme-hs), 55%);
}

.codraw-canvas {
  flex: 1;
  width: 100%;
  min-height: 12rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
  border-radius: var(--bulma-radius-small);
  background-color: #14141a; // DRAW_COLORS[0]; the canvas paints over it
  cursor: crosshair;
  touch-action: none; // let a drag draw instead of scrolling the window
}

.codraw-tools {
  display: flex;
  flex-wrap: wrap; // on a narrow phone the pens + clear can't share one row
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.codraw-pens {
  display: flex;
  flex-wrap: wrap; // 8 coarse-size pens overflow a 320px window on their own row
  gap: 0.35rem;
}

.codraw-pen {
  width: 1.4rem;
  height: 1.4rem;
  padding: 0;
  border: 1px solid hsla(var(--lv-scheme-hs), 60%, 0.4);
  border-radius: 50%;
  background-color: var(--pen);
  cursor: pointer;

  &.is-active {
    box-shadow: 0 0 0 2px hsl(var(--lv-primary-hsl));
  }

  @media (pointer: coarse) {
    width: 2.1rem;
    height: 2.1rem;
  }
}

.codraw-clear {
  padding: 0.25rem 0.6rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.3);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: hsl(var(--lv-scheme-hs), 80%);
  font: inherit;
  cursor: pointer;

  &:hover {
    border-color: hsla(var(--lv-primary-hsl), 0.6);
    color: hsl(var(--lv-scheme-hs), 95%);
  }

  @media (pointer: coarse) {
    min-height: 2.4rem;
    padding: 0.3rem 0.9rem;
  }
}
</style>
