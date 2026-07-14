<template>
  <div ref="rootRef" class="codraw is-family-code">
    <div class="codraw-head">
      <span>whiteboard</span>
      <span class="codraw-online">{{ statusLabel }}</span>
    </div>

    <div class="codraw-stage">
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
      <!-- live pens of the other visitors, positioned over the board -->
      <div class="codraw-cursors" aria-hidden="true">
        <span
          v-for="(cur, id) in cursors"
          :key="id"
          class="codraw-cursor"
          :style="{ left: `${cur.x * 100}%`, top: `${cur.y * 100}%`, '--dot': COLORS[cur.c] }"
        />
      </div>
    </div>

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
      <div class="codraw-actions">
        <button class="codraw-clear" :disabled="!canUndo" title="Undo your last stroke (for everyone)" @click="onUndo">
          {{ undone ? 'undone' : 'undo' }}
        </button>
        <button class="codraw-clear" title="Save the board to the Gallery and download a PNG" @click="saveBoard">
          {{ saved ? 'saved ✓' : 'save' }}
        </button>
        <button
          class="codraw-clear"
          :class="{ 'is-confirm': confirmClear }"
          :title="confirmClear ? 'Tap again to wipe it for everyone' : 'Clear the board for everyone'"
          @click="onClear"
        >
          {{ confirmClear ? 'clear all?' : 'clear' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { DRAW_COLORS } from '../../../realtime/draw-core.mjs'
import { addToGallery } from '~/utils/gallery'

// The lvOS face of the co-draw whiteboard. Same shared board as the terminal
// `draw` command (useCoDraw's shared state + relay lease); freehand segments in
// normalized 0..1 space so every window/screen renders the same drawing at any
// size. Works solo (local only) when no relay is configured.

const COLORS = DRAW_COLORS
const { enabled, strokes, online, status, cursors, join, startStroke, addStroke, undo, canUndo, clear: clearBoard, sendCursor, pruneCursors } = useCoDraw()

// flash 'undone' on the button when an undo actually removed one of our strokes,
// matching the way save flashes 'saved ✓'
const undone = ref(false)
let undoneTimer: ReturnType<typeof setTimeout> | undefined
const onUndo = () => {
  if (!undo()) return
  undone.value = true
  clearTimeout(undoneTimer)
  undoneTimer = setTimeout(() => { undone.value = false }, 1200)
}

const rootRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

// Ctrl+Z / ⌘Z undoes the last stroke when the whiteboard is the front window —
// z-index picks the front app so the shortcut can't fire under another window
const isFrontWindow = (): boolean => {
  const myWin = rootRef.value?.closest<HTMLElement>('.lvos-window')
  if (!myWin) return true
  if (myWin.classList.contains('is-minimized')) return false
  let front: HTMLElement | null = null
  let maxZ = -Infinity
  for (const w of document.querySelectorAll<HTMLElement>('.lvos-window:not(.is-minimized)')) {
    const z = Number(getComputedStyle(w).zIndex) || 0
    if (z >= maxZ) { maxZ = z; front = w }
  }
  return myWin === front
}
useEventListener('keydown', (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z' && isFrontWindow()) {
    event.preventDefault()
    onUndo()
  }
})
const pen = ref(2) // the amber pen by default

// clear wipes the shared board for everyone with no undo, so ask once first: the
// first tap arms it ("clear all?"), a second within 3s actually clears
const confirmClear = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | undefined
const onClear = () => {
  if (confirmTimer) clearTimeout(confirmTimer)
  if (confirmClear.value) { confirmClear.value = false; clearBoard(); return }
  confirmClear.value = true
  confirmTimer = setTimeout(() => { confirmClear.value = false }, 3000)
}

const statusLabel = computed(() => {
  if (!enabled.value) return 'solo — no relay'
  if (status.value === 'open') return `${online.value} drawing`
  if (status.value === 'lost') return 'connection lost'
  return 'connecting…'
})

let dpr = 1

// paint the whole board onto any 2D context at its pixel size — shared by the
// live canvas and the fixed-size snapshot the save button renders
const paintBoard = (ctx: CanvasRenderingContext2D, w: number, h: number, lineScale: number) => {
  ctx.fillStyle = COLORS[0]!
  ctx.fillRect(0, 0, w, h)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of strokes.value) {
    ctx.strokeStyle = COLORS[s.c] ?? COLORS[1]!
    // the eraser (index 0, board colour) draws fatter so it clears cleanly
    ctx.lineWidth = (s.c === 0 ? 16 : 3) * lineScale
    ctx.beginPath()
    ctx.moveTo(s.x0 * w, s.y0 * h)
    ctx.lineTo(s.x1 * w, s.y1 * h)
    ctx.stroke()
  }
}

const redraw = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  paintBoard(ctx, canvas.width, canvas.height, dpr)
}

// snapshot the board at a fixed size → the shared lvOS Gallery + a PNG download
const saved = ref(false)
const saveBoard = () => {
  const w = 960
  const h = 600
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const ctx = off.getContext('2d')
  if (!ctx) return
  paintBoard(ctx, w, h, 2)
  const url = off.toDataURL('image/png')
  addToGallery(url)
  const a = document.createElement('a')
  a.href = url
  a.download = 'whiteboard.png'
  a.click()
  saved.value = true
  setTimeout(() => { saved.value = false }, 1600)
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

// pen positions are broadcast far more coarsely than strokes are drawn
let lastCursorAt = 0
const shareCursor = (x: number, y: number) => {
  const now = Date.now()
  if (now - lastCursorAt < 50) return
  lastCursorAt = now
  sendCursor(x, y, pen.value)
}

const onDown = (event: PointerEvent) => {
  const p = posOf(event)
  if (!p) return
  last = p
  canvasRef.value?.setPointerCapture(event.pointerId)
  shareCursor(p.x, p.y)
  startStroke() // open a new pen-drag so this whole stroke undoes as one
  // a tap leaves a dot: a zero-length segment
  addStroke({ x0: p.x, y0: p.y, x1: p.x, y1: p.y, c: pen.value })
}

const onMove = (event: PointerEvent) => {
  const p = posOf(event)
  if (!p) return
  shareCursor(p.x, p.y) // show the pen moving even while just hovering
  if (!last) return
  addStroke({ x0: last.x, y0: last.y, x1: p.x, y1: p.y, c: pen.value })
  last = p
}

const onUp = (event: PointerEvent) => {
  last = null
  if (canvasRef.value?.hasPointerCapture(event.pointerId)) {
    canvasRef.value.releasePointerCapture(event.pointerId)
  }
}

let release: (() => void) | undefined
let pruneTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  release = join()
  fit()
  // drop remote cursor dots that have gone quiet
  pruneTimer = setInterval(pruneCursors, 1000)
})
onUnmounted(() => {
  release?.()
  if (confirmTimer) clearTimeout(confirmTimer)
  if (pruneTimer) clearInterval(pruneTimer)
  clearTimeout(undoneTimer)
})

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

.codraw-stage {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 12rem;
}

.codraw-canvas {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
  border-radius: var(--bulma-radius-small);
  background-color: #14141a; // DRAW_COLORS[0]; the canvas paints over it
  cursor: crosshair;
  touch-action: none; // let a drag draw instead of scrolling the window
}

// the other visitors' live pens float over the board, not on the canvas
.codraw-cursors {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.codraw-cursor {
  position: absolute;
  width: 0.6rem;
  height: 0.6rem;
  border: 1px solid rgb(0 0 0 / 40%);
  border-radius: 50%;
  background-color: var(--dot);
  box-shadow: 0 0 0 2px hsla(var(--lv-scheme-hs), 8%, 0.6);
  transform: translate(-50%, -50%);
  transition: left 0.08s linear, top 0.08s linear; // flattened under reduce-motion
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

.codraw-actions {
  display: flex;
  gap: 0.4rem;
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

  &.is-confirm {
    border-color: var(--bulma-danger);
    color: var(--bulma-danger);
  }

  @media (pointer: coarse) {
    min-height: 2.4rem;
    padding: 0.3rem 0.9rem;
  }
}
</style>
