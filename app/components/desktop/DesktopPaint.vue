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
      <button class="paint-clear" @click="clear">[clear]</button>
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
    <p class="paint-note">lvpaint.exe — masterpieces are lost on close, screenshot responsibly</p>
  </div>
</template>

<script setup lang="ts">
// Tiny paint app: pointer strokes on a canvas, nothing more, nothing less.

const COLORS = ['#ffba00', '#f5f5f5', '#f14668', '#3ec46d', '#3e8ed0', '#111111']

const canvasRef = ref<HTMLCanvasElement>()
const brushColor = ref(COLORS[0]!)
const brushSize = ref(5)
let drawing = false

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
  canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
}
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

.paint-clear {
  margin-left: auto;
  border: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 55%);
  font: inherit;
  font-size: 0.7rem;
  cursor: pointer;

  &:hover {
    color: var(--bulma-danger);
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
