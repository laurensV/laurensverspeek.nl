<template>
  <div ref="hostRef" class="world is-family-code">
    <div class="world-stage">
      <canvas
        ref="canvasRef"
        class="world-canvas"
        :class="{ 'is-panning': panning }"
        role="img"
        aria-label="The shared pixel canvas — drag to pan, scroll to zoom, click to place a pixel"
        @pointerdown.prevent="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
        @wheel.prevent="onWheel"
      />
      <canvas ref="miniRef" class="world-mini" aria-hidden="true" @pointerdown.prevent="onMiniJump" />
      <span v-if="plot" class="world-plot">◆ {{ plot }}</span>
    </div>

    <div class="world-hud">
      <span :class="connected ? 'world-live' : 'world-offline'">
        {{ connected ? `● ${online} here · ${recent} pixels/10min` : '○ offline world — pixels stay in this browser' }}
      </span>
      <span class="world-coords">({{ hover.x }}, {{ hover.y }})</span>
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

    <div class="world-lapse">
      <button class="world-lapse-btn" :disabled="history.length < 2" @click="toggleLapse">
        {{ lapsePlaying ? '■ stop' : '▶ time-lapse' }}
      </button>
      <input
        v-model.number="lapsePos"
        class="world-lapse-slider"
        type="range"
        min="0"
        :max="history.length"
        :disabled="history.length < 2"
        aria-label="Time-lapse position"
        @input="lapsePlaying = false"
      >
      <span class="world-lapse-count">{{ lapseActive ? `${lapsePos}/${history.length}` : `${history.length} recent` }}</span>
    </div>

    <p v-if="hoverInfo" class="world-info">
      ({{ hoverInfo.x }}, {{ hoverInfo.y }}) —
      <template v-if="hoverInfo.by">placed by <b>{{ hoverInfo.by }}</b> {{ age(hoverInfo.at!) }}</template>
      <template v-else>founding landscape</template>
    </p>
    <p v-else class="world-hint">
      drag to pan · scroll to zoom · click to place · hover for a pixel's story · ▶ to replay recent pixels
    </p>
  </div>
</template>

<script setup lang="ts">
import { useEventListener, useRafFn } from '@vueuse/core'
import { boardToScreen, screenToBoard, visibleRange, clampCamera } from '~/utils/worldCamera'
import type { Camera } from '~/utils/worldCamera'

// The Pixel World viewport: pan, zoom, place, gossip — plus a minimap, a live
// coordinate readout, plot labels and a time-lapse of recent placements. Board
// state and networking live in useWorld; the camera math in useWorldCamera.
const world = useWorld()
const { PALETTE, SIZE, board, version, online, recent, connected, nextPlaceAt, cursors, gotoTarget, lastInfo, history } = world

const hostRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const miniRef = ref<HTMLCanvasElement>()
const selected = ref(4) // start on the amber, naturally
const panning = ref(false)
const hover = reactive({ x: 0, y: 0 })
const plot = computed(() => world.plotAt(Math.round(cam.x), Math.round(cam.y)))

const cam = reactive<Camera>({ x: SIZE / 2, y: SIZE / 2, zoom: 6 })
const view = () => ({ w: canvasRef.value?.clientWidth ?? 0, h: canvasRef.value?.clientHeight ?? 0 })

// tick the cooldown readout only while a cooldown is actually running — a
// permanent rAF loop would paint 60 no-op frames/s the whole time the window
// is open
const cooldownLeft = ref(0)
const { pause: pauseCooldown, resume: resumeCooldown } = useRafFn(() => {
  cooldownLeft.value = Math.max(0, nextPlaceAt.value - Date.now())
  if (cooldownLeft.value === 0) pauseCooldown()
}, { immediate: false })
watch(nextPlaceAt, (at) => {
  if (at > Date.now()) resumeCooldown()
}, { immediate: true })

const hoverInfo = computed(() => lastInfo.value)

// ---- time-lapse ----
const lapsePos = ref(0)
const lapsePlaying = ref(false)
const lapseActive = computed(() => lapsePlaying.value || (lapsePos.value > 0 && lapsePos.value < history.value.length))
let lapseTimer: ReturnType<typeof setInterval> | undefined
const toggleLapse = () => {
  if (lapsePlaying.value) {
    lapsePlaying.value = false
    return
  }
  lapsePos.value = 0
  lapsePlaying.value = true
  clearInterval(lapseTimer)
  lapseTimer = setInterval(() => {
    lapsePos.value++
    if (lapsePos.value >= history.value.length) {
      lapsePos.value = history.value.length
      lapsePlaying.value = false
      clearInterval(lapseTimer)
    }
  }, 120)
}
watch(lapsePlaying, (playing) => { if (!playing) clearInterval(lapseTimer) })

onMounted(() => {
  world.enter()
  fit()
})
onUnmounted(() => {
  clearInterval(lapseTimer)
  world.leave()
})

watch(gotoTarget, (target) => {
  if (!target) return
  cam.x = target.x
  cam.y = target.y
  cam.zoom = Math.max(cam.zoom, 10)
  gotoTarget.value = null
})

// ---- painting ----
let ctx2d: CanvasRenderingContext2D | null = null
let miniCtx: CanvasRenderingContext2D | null = null
const fit = () => {
  const host = hostRef.value
  const canvas = canvasRef.value
  const mini = miniRef.value
  if (!host || !canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cssH = host.clientHeight - 116
  canvas.width = host.clientWidth * dpr
  canvas.height = cssH * dpr
  canvas.style.height = `${cssH}px`
  ctx2d = canvas.getContext('2d')
  ctx2d?.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (mini) {
    mini.width = 96
    mini.height = 96
    miniCtx = mini.getContext('2d')
  }
  draw()
}
useEventListener('resize', fit)

const draw = () => {
  const context = ctx2d
  const cells = board.value
  if (!context || !canvasRef.value) return
  const v = view()
  context.fillStyle = '#0a0a0d'
  context.fillRect(0, 0, v.w, v.h)
  if (!cells) return
  const origin = boardToScreen(cam, v, 0, 0)
  context.fillStyle = PALETTE[0]!
  context.fillRect(origin.x, origin.y, SIZE * cam.zoom, SIZE * cam.zoom)

  // during a time-lapse we render a subset: the board minus placements after
  // lapsePos (so it "rewinds"), overwriting recent cells with their prior look
  const lapseCut = lapseActive.value ? lapsePos.value : history.value.length
  const rewound = new Map<number, number>()
  if (lapseActive.value) {
    for (let i = history.value.length - 1; i >= lapseCut; i--) {
      const h = history.value[i]!
      const idx = h.y * SIZE + h.x
      if (!rewound.has(idx)) rewound.set(idx, 0) // no prior color known → background
    }
  }

  const range = visibleRange(cam, v, SIZE)
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      const idx = y * SIZE + x
      const c = rewound.has(idx) ? rewound.get(idx)! : cells[idx]!
      if (c === 0) continue
      context.fillStyle = PALETTE[c]!
      const p = boardToScreen(cam, v, x, y)
      context.fillRect(p.x, p.y, cam.zoom + 0.5, cam.zoom + 0.5)
    }
  }
  // the freshest lapse pixel glows
  if (lapseActive.value && lapsePos.value > 0) {
    const h = history.value[Math.min(lapsePos.value, history.value.length) - 1]!
    const p = boardToScreen(cam, v, h.x, h.y)
    context.strokeStyle = '#ffffff'
    context.strokeRect(p.x - 1, p.y - 1, cam.zoom + 2, cam.zoom + 2)
  }

  context.strokeStyle = 'rgba(255, 186, 0, 0.5)'
  context.strokeRect(origin.x - 1, origin.y - 1, SIZE * cam.zoom + 2, SIZE * cam.zoom + 2)
  for (const cursor of cursors.value) {
    const p = boardToScreen(cam, v, cursor.x, cursor.y)
    context.fillStyle = `hsl(${cursor.hue}, 80%, 60%)`
    context.beginPath()
    context.arc(p.x, p.y, 4, 0, Math.PI * 2)
    context.fill()
  }
  drawMini()
}

const drawMini = () => {
  const context = miniCtx
  const cells = board.value
  if (!context || !cells) return
  const scale = 96 / SIZE
  context.fillStyle = '#0a0a0d'
  context.fillRect(0, 0, 96, 96)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = cells[y * SIZE + x]!
      if (c === 0) continue
      context.fillStyle = PALETTE[c]!
      context.fillRect(x * scale, y * scale, scale + 0.5, scale + 0.5)
    }
  }
  // the current viewport box
  const v = view()
  const from = screenToBoard(cam, v, 0, 0)
  const to = screenToBoard(cam, v, v.w, v.h)
  context.strokeStyle = 'rgba(255, 186, 0, 0.9)'
  context.strokeRect(from.x * scale, from.y * scale, (to.x - from.x) * scale, (to.y - from.y) * scale)
}

// coalesce redraws into one frame: panning mutates cam on every pointermove,
// and a full 128×128 minimap scan per move drops frames — so mark dirty and
// let one rAF flush it
let redrawQueued = false
const scheduleDraw = () => {
  if (redrawQueued) return
  redrawQueued = true
  requestAnimationFrame(() => {
    redrawQueued = false
    draw()
  })
}
watch([version, cursors, lapsePos, () => cam.x, () => cam.y, () => cam.zoom], scheduleDraw)

// ---- pointer ----
let down: { x: number, y: number, moved: boolean } | null = null
let lastWho = 0
let lastCursorSent = 0

const onDown = (event: PointerEvent) => {
  down = { x: event.offsetX, y: event.offsetY, moved: false }
  canvasRef.value?.setPointerCapture(event.pointerId)
}

const onMove = (event: PointerEvent) => {
  const cell = screenToBoard(cam, view(), event.offsetX, event.offsetY)
  hover.x = cell.x
  hover.y = cell.y
  if (down && (down.moved || Math.hypot(event.offsetX - down.x, event.offsetY - down.y) > 4)) {
    down.moved = true
    panning.value = true
    Object.assign(cam, clampCamera({ x: cam.x - event.movementX / cam.zoom, y: cam.y - event.movementY / cam.zoom, zoom: cam.zoom }, SIZE))
    return
  }
  const now = Date.now()
  if (now - lastWho > 250 && cell.x >= 0 && cell.x < SIZE && cell.y >= 0 && cell.y < SIZE) {
    lastWho = now
    world.who(cell.x, cell.y)
  }
  if (now - lastCursorSent > 150) {
    lastCursorSent = now
    world.sendCursor(cell.x, cell.y)
  }
}

const onUp = (event: PointerEvent) => {
  const wasClick = down && !down.moved
  down = null
  panning.value = false
  if (!wasClick) return
  const cell = screenToBoard(cam, view(), event.offsetX, event.offsetY)
  world.place(cell.x, cell.y, selected.value)
}

const onWheel = (event: WheelEvent) => {
  const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2
  Object.assign(cam, clampCamera({ x: cam.x, y: cam.y, zoom: cam.zoom * factor }, SIZE))
}

// click the minimap to jump the camera there
const onMiniJump = (event: PointerEvent) => {
  const rect = miniRef.value?.getBoundingClientRect()
  if (!rect) return
  cam.x = Math.round(((event.clientX - rect.left) / rect.width) * SIZE)
  cam.y = Math.round(((event.clientY - rect.top) / rect.height) * SIZE)
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
  // height comes from the host: the /world page's .world-frame sets it, and the
  // lvOS window body stretches this root via flex. A `height: 100%` here fought
  // .world-frame (same element) and, when it won, spilled the palette/hint rows
  // out the bottom of the frame and under the mobile tab bar.
  min-height: 24rem;
}

.world-stage {
  position: relative;
  flex: 1;
  min-height: 0;
}

.world-canvas {
  width: 100%;
  height: 100%;
  border-radius: var(--bulma-radius);
  cursor: crosshair;
  touch-action: none;

  &.is-panning {
    cursor: grabbing;
  }
}

.world-mini {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  width: 96px;
  height: 96px;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius-small);
  background: #0a0a0d;
  cursor: pointer;
}

.world-plot {
  position: absolute;
  left: 0.5rem;
  top: 0.5rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--bulma-radius-small);
  background: hsla(var(--lv-scheme-hs), 8%, 0.85);
  color: var(--bulma-primary);
  font-size: 0.7rem;
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
  .world-coords { color: hsl(var(--lv-scheme-hs), 60%); }
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

.world-lapse {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem;
  font-size: 0.68rem;

  .world-lapse-btn {
    padding: 0.15rem 0.5rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    font-size: 0.68rem;
    cursor: pointer;

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }

  .world-lapse-slider {
    flex: 1;
    accent-color: var(--bulma-primary);
  }

  .world-lapse-count {
    color: hsl(var(--lv-scheme-hs), 55%);
    white-space: nowrap;
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
