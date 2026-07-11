<template>
  <div ref="hostRef" class="world is-family-code">
    <canvas
      ref="canvasRef"
      class="world-canvas"
      :class="{ 'is-panning': panning }"
      @pointerdown.prevent="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointerleave="onUp"
      @wheel.prevent="onWheel"
    />

    <div class="world-hud">
      <span :class="connected ? 'world-live' : 'world-offline'">
        {{ connected ? `● ${online} here · ${recent} pixels/10min` : '○ offline world — pixels stay in this browser' }}
      </span>
      <span v-if="cooldownLeft > 0" class="world-cooldown">next pixel in {{ Math.ceil(cooldownLeft / 1000) }}s</span>
      <span v-else class="world-ready">ready to place</span>
    </div>

    <div class="world-palette" role="radiogroup" aria-label="Pixel color">
      <button
        v-for="(color, i) in PALETTE"
        :key="color"
        class="world-swatch"
        :class="{ 'is-active': selected === i }"
        :style="{ background: color }"
        :aria-label="`Color ${i}`"
        :aria-pressed="selected === i"
        @click="selected = i"
      />
    </div>

    <p v-if="hoverInfo" class="world-info">
      ({{ hoverInfo.x }}, {{ hoverInfo.y }}) —
      <template v-if="hoverInfo.by">placed by <b>{{ hoverInfo.by }}</b> {{ age(hoverInfo.at!) }}</template>
      <template v-else>founding landscape</template>
    </p>
    <p v-else class="world-hint">
      drag to pan · scroll to zoom · click to place · hover a pixel for its story
    </p>
  </div>
</template>

<script setup lang="ts">
import { useEventListener, useRafFn } from '@vueuse/core'

// The Pixel World viewport: pan, zoom, place, gossip. All board state and
// networking live in useWorld; this component is camera + pointer + paint.
const world = useWorld()
const { PALETTE, SIZE, board, version, online, recent, connected, nextPlaceAt, cursors, gotoTarget, lastInfo } = world

const hostRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const selected = ref(4) // start on the amber, naturally
const panning = ref(false)

// camera: board-space center + pixels-per-cell
const cam = reactive({ x: SIZE / 2, y: SIZE / 2, zoom: 6 })

const cooldownLeft = ref(0)
useRafFn(() => {
  cooldownLeft.value = Math.max(0, nextPlaceAt.value - Date.now())
})

const hoverInfo = computed(() => lastInfo.value)

onMounted(() => {
  world.enter()
  fit()
})
onUnmounted(() => world.leave())

// `world goto x y` from the terminal lands here
watch(gotoTarget, (target) => {
  if (!target) return
  cam.x = target.x
  cam.y = target.y
  cam.zoom = Math.max(cam.zoom, 10)
  gotoTarget.value = null
})

// ---- painting ----
let ctx2d: CanvasRenderingContext2D | null = null
const fit = () => {
  const host = hostRef.value
  const canvas = canvasRef.value
  if (!host || !canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = host.clientWidth * dpr
  canvas.height = (host.clientHeight - 90) * dpr
  canvas.style.height = `${host.clientHeight - 90}px`
  ctx2d = canvas.getContext('2d')
  ctx2d?.setTransform(dpr, 0, 0, dpr, 0, 0)
  draw()
}
useEventListener('resize', fit)

const viewSize = () => ({
  w: (canvasRef.value?.clientWidth ?? 0),
  h: (canvasRef.value?.clientHeight ?? 0)
})

const boardToScreen = (bx: number, by: number) => {
  const { w, h } = viewSize()
  return { x: w / 2 + (bx - cam.x) * cam.zoom, y: h / 2 + (by - cam.y) * cam.zoom }
}
const screenToBoard = (sx: number, sy: number) => {
  const { w, h } = viewSize()
  return {
    x: Math.floor(cam.x + (sx - w / 2) / cam.zoom),
    y: Math.floor(cam.y + (sy - h / 2) / cam.zoom)
  }
}

const draw = () => {
  const context = ctx2d
  const cells = board.value
  if (!context || !canvasRef.value) return
  const { w, h } = viewSize()
  context.fillStyle = '#0a0a0d'
  context.fillRect(0, 0, w, h)
  if (!cells) return
  const origin = boardToScreen(0, 0)
  // the board's backing plate
  context.fillStyle = PALETTE[0]!
  context.fillRect(origin.x, origin.y, SIZE * cam.zoom, SIZE * cam.zoom)
  const from = screenToBoard(0, 0)
  const to = screenToBoard(w, h)
  for (let y = Math.max(0, from.y); y <= Math.min(SIZE - 1, to.y + 1); y++) {
    for (let x = Math.max(0, from.x); x <= Math.min(SIZE - 1, to.x + 1); x++) {
      const c = cells[y * SIZE + x]!
      if (c === 0) continue
      context.fillStyle = PALETTE[c]!
      const p = boardToScreen(x, y)
      context.fillRect(p.x, p.y, cam.zoom + 0.5, cam.zoom + 0.5)
    }
  }
  // frame + faint grid when zoomed in
  context.strokeStyle = 'rgba(255, 186, 0, 0.5)'
  context.strokeRect(origin.x - 1, origin.y - 1, SIZE * cam.zoom + 2, SIZE * cam.zoom + 2)
  // other visitors' cursors
  for (const cursor of cursors.value) {
    const p = boardToScreen(cursor.x, cursor.y)
    context.fillStyle = `hsl(${cursor.hue}, 80%, 60%)`
    context.beginPath()
    context.arc(p.x, p.y, 4, 0, Math.PI * 2)
    context.fill()
  }
}

watch([version, cursors, () => cam.x, () => cam.y, () => cam.zoom], draw)

// ---- pointer: drag pans, click places, hover asks ----
let down: { x: number, y: number, moved: boolean } | null = null
let lastWho = 0
let lastCursorSent = 0

const onDown = (event: PointerEvent) => {
  down = { x: event.offsetX, y: event.offsetY, moved: false }
  canvasRef.value?.setPointerCapture(event.pointerId)
}

const onMove = (event: PointerEvent) => {
  if (down && (down.moved || Math.hypot(event.offsetX - down.x, event.offsetY - down.y) > 4)) {
    down.moved = true
    panning.value = true
    cam.x -= event.movementX / cam.zoom
    cam.y -= event.movementY / cam.zoom
    return
  }
  const cell = screenToBoard(event.offsetX, event.offsetY)
  const now = Date.now()
  if (now - lastWho > 250 && cell.x >= 0 && cell.x < SIZE && cell.y >= 0 && cell.y < SIZE) {
    lastWho = now
    world.who(cell.x, cell.y)
  }
  if (now - lastCursorSent > 150) {
    lastCursorSent = now
    world.sendCursor(cam.x + (event.offsetX - viewSize().w / 2) / cam.zoom, cam.y + (event.offsetY - viewSize().h / 2) / cam.zoom)
  }
}

const onUp = (event: PointerEvent) => {
  const wasClick = down && !down.moved
  down = null
  panning.value = false
  if (!wasClick) return
  const cell = screenToBoard(event.offsetX, event.offsetY)
  world.place(cell.x, cell.y, selected.value)
}

const onWheel = (event: WheelEvent) => {
  const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2
  cam.zoom = Math.min(40, Math.max(2, cam.zoom * factor))
}

const age = (at: number) => {
  const mins = Math.floor((Date.now() - at) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
}
</script>

<style scoped lang="scss">
.world {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 24rem;
}

.world-canvas {
  flex: 1;
  width: 100%;
  border-radius: var(--bulma-radius);
  cursor: crosshair;
  touch-action: none;

  &.is-panning {
    cursor: grabbing;
  }
}

.world-hud {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.4rem 0.2rem 0.1rem;
  font-size: 0.7rem;

  .world-live { color: var(--bulma-success); }
  .world-offline { color: hsl(var(--lv-scheme-hs), 55%); }
  .world-cooldown { color: var(--bulma-danger); }
  .world-ready { color: var(--bulma-primary); }
}

.world-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0.3rem 0.2rem;
}

.world-swatch {
  width: 1.4rem;
  height: 1.4rem;
  border: 2px solid transparent;
  border-radius: var(--bulma-radius-small);
  cursor: pointer;

  &.is-active {
    border-color: var(--bulma-primary);
    transform: scale(1.15);
  }
}

.world-info,
.world-hint {
  min-height: 1.2em;
  padding: 0.1rem 0.2rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.7rem;
}

.world-info b {
  color: var(--bulma-primary);
}
</style>
