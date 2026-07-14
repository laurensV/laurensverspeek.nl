<template>
  <div
    ref="rootRef"
    class="desktop-snake is-family-code"
    tabindex="0"
    role="application"
    aria-label="Snake"
    @keydown="onKeydown"
  >
    <div class="dsnake-head">
      <span class="dsnake-score">score {{ score }}</span>
      <span class="dsnake-hint">arrows or wasd to move · q ends</span>
    </div>

    <div ref="stageRef" class="dsnake-stage">
      <canvas ref="canvasRef" class="dsnake-canvas" aria-hidden="true" />
      <div v-if="result" class="dsnake-over">
        <p v-for="line in result" :key="line" class="dsnake-result">{{ line }}</p>
        <button class="dsnake-again" @click="start">play again</button>
      </div>
    </div>

    <!-- touch d-pad: the desktop snake was keyboard-only, so unplayable on a
         phone — same pad the terminal snake and museum walk offer -->
    <div class="dsnake-pad" aria-hidden="true">
      <button @pointerdown.prevent="move('ArrowUp')">▲</button>
      <div>
        <button @pointerdown.prevent="move('ArrowLeft')">◀</button>
        <button @pointerdown.prevent="move('ArrowDown')">▼</button>
        <button @pointerdown.prevent="move('ArrowRight')">▶</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { createSnakeGame, type GameHandle, type SnakeState } from '~/utils/terminalGames'

// Snake as a desktop window. It reuses the exact terminal engine, but instead of
// the ASCII frame it draws the engine's structured state on a canvas with square
// cells that scale to fill the window — so the board no longer looks skewed and
// stops jittering as the score's digit count changes.

const rootRef = ref<HTMLElement>()
const stageRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

const state = ref<SnakeState | null>(null)
const result = ref<string[] | null>(null)
const score = computed(() => state.value?.score ?? 0)
let game: GameHandle | null = null

const start = () => {
  result.value = null
  game?.stop()
  game = createSnakeGame(
    {
      onFrame: () => {}, // the canvas renders from onState; the ASCII frame is unused here
      onEnd: (lines) => { result.value = lines }
    },
    (s) => {
      state.value = s
      draw()
    }
  )
  void nextTick(() => rootRef.value?.focus())
}

const onKeydown = (event: KeyboardEvent) => {
  if (!game || result.value) return
  if (game.onKey(event.key)) event.preventDefault()
}

// d-pad taps steer through the same engine input the keyboard uses
const move = (key: string) => {
  if (!game || result.value) return
  game.onKey(key)
}

// ---- canvas ----
const dpr = () => Math.min(window.devicePixelRatio || 1, 2)

const fit = () => {
  const canvas = canvasRef.value
  const stage = stageRef.value
  if (!canvas || !stage) return
  const ratio = dpr()
  const w = stage.clientWidth
  const h = stage.clientHeight
  canvas.width = Math.max(1, Math.round(w * ratio))
  canvas.height = Math.max(1, Math.round(h * ratio))
  const ctx = canvas.getContext('2d')
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
  draw()
}

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const ratio = dpr()
  const W = canvas.width / ratio
  const H = canvas.height / ratio
  ctx.clearRect(0, 0, W, H)
  const s = state.value
  if (!s) return

  // biggest square cell that fits both axes, board centered in the stage
  const cell = Math.max(4, Math.floor(Math.min(W / s.width, H / s.height)))
  const boardW = cell * s.width
  const boardH = cell * s.height
  const ox = Math.floor((W - boardW) / 2)
  const oy = Math.floor((H - boardH) / 2)

  const amber = getComputedStyle(canvas).getPropertyValue('--bulma-primary').trim() || '#ffba00'

  // play field + wall frame (the engine's kill boundary is the outer ring)
  ctx.fillStyle = 'rgba(10, 10, 13, 0.55)'
  ctx.fillRect(ox, oy, boardW, boardH)
  ctx.strokeStyle = amber
  ctx.globalAlpha = 0.4
  ctx.lineWidth = Math.max(1, cell * 0.12)
  ctx.strokeRect(ox + cell / 2, oy + cell / 2, boardW - cell, boardH - cell)
  ctx.globalAlpha = 1

  const px = (x: number) => ox + x * cell
  const py = (y: number) => oy + y * cell

  // food: a filled dot
  ctx.fillStyle = '#e94560'
  ctx.beginPath()
  ctx.arc(px(s.food.x) + cell / 2, py(s.food.y) + cell / 2, cell * 0.34, 0, Math.PI * 2)
  ctx.fill()

  // snake: rounded cells, head brightest, body slightly dimmer
  const gap = Math.max(1, Math.round(cell * 0.12))
  const size = cell - gap
  const radius = Math.min(size / 2, cell * 0.28)
  s.snake.forEach((seg, i) => {
    ctx.fillStyle = amber
    ctx.globalAlpha = i === 0 ? 1 : 0.72
    roundRect(ctx, px(seg.x) + gap / 2, py(seg.y) + gap / 2, size, size, radius)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

useResizeObserver(stageRef, fit)

onMounted(() => {
  start()
  fit()
})
onUnmounted(() => game?.stop())
</script>

<style scoped lang="scss">
.desktop-snake {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  outline: none;
  padding: 0.5rem;
  min-width: min(22rem, 100%);
  // fill the window height so the board can grow when maximized
  min-height: 16rem;
}

.dsnake-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;

  .dsnake-score {
    color: var(--bulma-primary);
    font-size: 0.9rem;
  }

  .dsnake-hint {
    color: hsl(var(--lv-scheme-hs), 55%);
    font-size: 0.7rem;
  }
}

.dsnake-stage {
  position: relative;
  flex: 1;
  min-height: 10rem;
}

.dsnake-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

// game-over card floats over the last frame
.dsnake-over {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  padding: 1rem;
  background: hsla(var(--lv-scheme-hs), 8%, 0.72);
  border-radius: var(--bulma-radius-small);
  text-align: center;
}

.dsnake-result {
  margin: 0;
  color: hsl(var(--lv-scheme-hs), 90%);
  font-size: 0.8rem;
}

.dsnake-again {
  margin-top: 0.5rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: var(--bulma-primary);
  font: inherit;
  cursor: pointer;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }
}

// touch d-pad: hidden where a keyboard is likely, shown on touch screens
.dsnake-pad {
  display: none;
  text-align: center;

  button {
    width: 2.6rem;
    height: 2.2rem;
    margin: 0.1rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    cursor: pointer;
  }
}

@media (hover: none) and (pointer: coarse) {
  .dsnake-pad {
    display: block;
  }
}
</style>
