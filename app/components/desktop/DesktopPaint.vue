<template>
  <div class="paint is-family-code">
    <div class="paint-toolbar">
      <button
        v-for="color in COLORS"
        :key="color"
        class="paint-swatch"
        :class="{ 'is-active': brushColor === color }"
        :style="{ backgroundColor: color }"
        :title="color"
        @click="brushColor = color"
      />
      <div class="paint-sizes">
        <button
          v-for="size in [2, 5, 10]"
          :key="size"
          :class="{ 'is-active': brushSize === size }"
          @click="brushSize = size"
        >{{ size }}px</button>
      </div>
      <button class="paint-wallpaper paint-undo" :disabled="!canUndo" title="Undo the last stroke" @click="undo">[undo]</button>
      <button class="paint-clear" @click="clear">[clear]</button>
      <button class="paint-wallpaper paint-gallery" @click="saveToGallery">{{ galleryLabel }}</button>
      <button class="paint-wallpaper paint-hang" @click="hangOnWall">{{ wallLabel }}</button>
    </div>
    <canvas
      ref="canvasRef"
      class="paint-canvas"
      width="560"
      height="320"
      @pointerdown="startStroke"
      @pointermove="stroke"
      @pointerup="endStroke"
      @pointerleave="endStroke"
    />
    <p class="paint-note">lvpaint.exe — save masterpieces to the gallery before closing</p>
  </div>
</template>

<script setup lang="ts">
// Tiny paint app: pointer strokes on a canvas. Drawings can hang as the
// wallpaper or land in the Gallery (same shelf the screenshot tool fills).

import { addToGallery } from '~/utils/gallery'

const COLORS = ['#ffba00', '#f5f5f5', '#f14668', '#3ec46d', '#3e8ed0', '#111111']

const canvasRef = ref<HTMLCanvasElement>()
const brushColor = ref(COLORS[0]!)
const brushSize = ref(5)
let drawing = false

// undo is a bounded stack of canvas snapshots (raster, so there are no strokes
// to pop) taken just before each drag or clear; canUndo mirrors its depth
// reactively without making the ImageData itself reactive
const UNDO_MAX = 20
const undoStack: ImageData[] = []
const canUndo = ref(false)
const snapshot = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  if (undoStack.length > UNDO_MAX) undoStack.shift()
  canUndo.value = true
}
const undo = () => {
  const ctx = canvasRef.value?.getContext('2d')
  const prev = undoStack.pop()
  if (!ctx || !prev) return
  ctx.putImageData(prev, 0, 0)
  canUndo.value = undoStack.length > 0
}

const canvasPoint = (event: PointerEvent) => {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  }
}

const startStroke = (event: PointerEvent) => {
  drawing = true
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  snapshot() // remember the canvas before this drag, so undo can restore it
  const { x, y } = canvasPoint(event)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

const stroke = (event: PointerEvent) => {
  if (!drawing) return
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  const { x, y } = canvasPoint(event)
  ctx.strokeStyle = brushColor.value
  ctx.lineWidth = brushSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineTo(x, y)
  ctx.stroke()
}

const endStroke = () => {
  drawing = false
}

const clear = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  snapshot() // a clear is undoable too
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
}

// export the drawing over the desktop's dark tone (the canvas itself is
// transparent) — shared by the wallpaper and gallery buttons
const exportDrawing = (): string | null => {
  const canvas = canvasRef.value
  if (!canvas) return null
  const framed = document.createElement('canvas')
  framed.width = canvas.width
  framed.height = canvas.height
  const ctx = framed.getContext('2d')!
  ctx.fillStyle = '#101014'
  ctx.fillRect(0, 0, framed.width, framed.height)
  ctx.drawImage(canvas, 0, 0)
  return framed.toDataURL('image/png')
}

const { setCustomWallpaper } = useWallpaper()
const wallLabel = ref('[set as wallpaper]')
let wallTimer: ReturnType<typeof setTimeout> | undefined
const hangOnWall = () => {
  const drawing = exportDrawing()
  if (!drawing) return
  const hung = setCustomWallpaper(drawing)
  wallLabel.value = hung ? '[hung on the wall ✓]' : '[storage said no]'
  clearTimeout(wallTimer)
  wallTimer = setTimeout(() => (wallLabel.value = '[set as wallpaper]'), 2500)
}

// the Gallery browses 'lvos-shots' — screenshots and masterpieces alike
const galleryLabel = ref('[save to gallery]')
let galleryTimer: ReturnType<typeof setTimeout> | undefined
const saveToGallery = () => {
  const drawing = exportDrawing()
  if (!drawing) return
  const saved = addToGallery(drawing)
  galleryLabel.value = saved ? '[in the gallery ✓]' : '[storage said no]'
  clearTimeout(galleryTimer)
  galleryTimer = setTimeout(() => (galleryLabel.value = '[save to gallery]'), 2500)
}

onUnmounted(() => {
  clearTimeout(wallTimer)
  clearTimeout(galleryTimer)
})
</script>

<style scoped lang="scss">
.paint {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.paint-toolbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.paint-swatch {
  width: 1.2rem;
  height: 1.2rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.4);
  border-radius: 2px;
  cursor: pointer;

  &.is-active {
    outline: 2px solid var(--bulma-primary);
    outline-offset: 1px;
  }
}

.paint-sizes {
  display: flex;
  gap: 0.2rem;
  margin-left: 0.5rem;

  button {
    border: none;
    background: none;
    color: hsl(var(--lv-scheme-hs), 55%);
    font: inherit;
    font-size: 0.7rem;
    cursor: pointer;

    &.is-active {
      color: var(--bulma-primary);
    }
  }
}

.paint-undo {
  margin-left: auto; // leads the right-hand action group (undo · clear · save · hang)
}

.paint-clear,
.paint-wallpaper {
  border: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 55%);
  font: inherit;
  font-size: 0.7rem;
  cursor: pointer;
}

.paint-undo:disabled {
  color: hsl(var(--lv-scheme-hs), 30%);
  cursor: default;
}

.paint-clear:hover {
  color: var(--bulma-danger);
}

.paint-wallpaper:hover {
  color: var(--bulma-primary);
}

// thumb-sized swatches and toolbar buttons on touch screens
@media (pointer: coarse) {
  .paint-swatch {
    width: 2.2rem;
    height: 2.2rem;
  }

  .paint-sizes button,
  .paint-clear,
  .paint-wallpaper {
    min-height: 2.4rem;
    padding: 0 0.4rem;
  }
}

.paint-canvas {
  width: 100%;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
  border-radius: var(--bulma-radius-small);
  background-color: hsl(var(--lv-scheme-hs), 6%);
  cursor: crosshair;
  touch-action: none;
}

.paint-note {
  font-size: 0.65rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}
</style>
