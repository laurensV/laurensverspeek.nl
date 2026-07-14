<template>
  <div
    ref="rootRef"
    class="dast is-family-code"
    tabindex="0"
    role="application"
    aria-label="Asteroids"
    @keydown="onKeydown"
    @keyup="onKeyup"
  >
    <div class="dast-hud">
      <span>score {{ score }}</span>
      <span class="dast-wave">wave {{ wave }}</span>
      <span v-if="best" class="dast-best">best {{ best }}</span>
    </div>

    <div ref="stageRef" class="dast-stage">
      <canvas ref="canvasRef" class="dast-canvas" />
      <div v-if="over" class="dast-over">
        <p class="dast-over-title">game over</p>
        <p class="dast-over-score">score {{ score }}</p>
        <p v-if="isBest" class="dast-over-best">new high score!</p>
        <button class="dast-again" @click="start">play again</button>
      </div>
      <p v-else-if="reduced" class="dast-paused">reduced motion — flight paused</p>
    </div>

    <p class="dast-hint">← → rotate · ↑ thrust · space fire</p>

    <!-- touch controls: the game is keyboard-only on a desktop, so gate a thumb
         pad behind coarse pointers (leaving the fine-pointer e2e untouched) -->
    <div class="dast-pad" aria-hidden="true">
      <button
        class="dast-pad-btn"
        @pointerdown.prevent="hold('left', true)"
        @pointerup.prevent="hold('left', false)"
        @pointerleave.prevent="hold('left', false)"
      >⟲</button>
      <button
        class="dast-pad-btn"
        @pointerdown.prevent="hold('thrust', true)"
        @pointerup.prevent="hold('thrust', false)"
        @pointerleave.prevent="hold('thrust', false)"
      >▲</button>
      <button
        class="dast-pad-btn"
        @pointerdown.prevent="hold('right', true)"
        @pointerup.prevent="hold('right', false)"
        @pointerleave.prevent="hold('right', false)"
      >⟳</button>
      <button class="dast-pad-btn dast-pad-fire" @pointerdown.prevent="fire()">●</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  stepShip,
  stepAsteroid,
  stepBullet,
  fireBullet,
  splitAsteroid,
  spawnWave,
  circlesOverlap,
  centeredShip,
  ASTEROID_SCORE,
  SHIP_RADIUS,
  type Ship,
  type Asteroid,
  type Bullet,
  type Field
} from '~/utils/games/asteroids'
import { useHighScore } from '~/utils/terminalGameKit'

// Classic vector Asteroids as an lvOS window. The maths lives in the pure,
// tested ~/utils/games/asteroids; this owns the canvas, input and the shared
// canvas scene (device-pixel scaling, a rAF loop that pauses under reduced
// motion / a hidden tab), and feeds the same economy every other game does.

const ASTEROIDS_KEY = 'lv-asteroids-highscore'
const FIRE_INTERVAL = 0.22
const MAX_BULLETS = 5

const rootRef = ref<HTMLElement>()
const stageRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

const score = ref(0)
const wave = ref(1)
const over = ref(false)
const isBest = ref(false)
const best = ref(0)
const reduced = useReducedMotion()

const highscore = useHighScore(ASTEROIDS_KEY)

// live simulation state — plain (non-reactive) so the 60fps loop never churns Vue
let field: Field = { width: 0, height: 0 }
let ship: Ship = centeredShip(field)
let asteroids: Asteroid[] = []
let bullets: Bullet[] = []
let fireCooldown = 0
let inited = false
const held = { left: false, right: false, thrust: false }

// stroke colour follows the theme's primary; re-read on resize + colour change
let stroke = '#ffba00'
const readColor = () => {
  const style = getComputedStyle(document.documentElement)
  const h = style.getPropertyValue('--bulma-primary-h').trim() || '45'
  const s = style.getPropertyValue('--bulma-primary-s').trim() || '100%'
  const l = style.getPropertyValue('--bulma-primary-l').trim() || '50%'
  stroke = `hsl(${h} ${s} ${l})`
}

const init = () => {
  ship = centeredShip(field)
  asteroids = spawnWave(4, field)
  bullets = []
  fireCooldown = 0
  score.value = 0
  wave.value = 1
  over.value = false
  isBest.value = false
  inited = true
}

const endGame = () => {
  over.value = true
  const result = highscore.record(score.value)
  best.value = highscore.get()
  isBest.value = result.isNew
}

const update = (dt: number) => {
  const turn: -1 | 0 | 1 = held.left === held.right ? 0 : held.left ? -1 : 1
  ship = stepShip(ship, { thrust: held.thrust, turn }, dt, field)

  fireCooldown -= dt
  bullets = bullets.map((b) => stepBullet(b, dt, field)).filter((b) => b.life > 0)
  asteroids = asteroids.map((a) => stepAsteroid(a, dt, field))

  // bullet vs asteroid: a hit removes the bullet, scores, and splits the rock
  const survivors: Asteroid[] = []
  for (const a of asteroids) {
    const hit = bullets.findIndex((b) => circlesOverlap(a.x, a.y, a.radius, b.x, b.y, 2))
    if (hit >= 0) {
      bullets.splice(hit, 1)
      score.value += ASTEROID_SCORE[a.size]
      survivors.push(...splitAsteroid(a))
    } else {
      survivors.push(a)
    }
  }
  asteroids = survivors

  // ship vs asteroid ends the run (a forgiving hull, at 0.7 of the nose radius)
  if (asteroids.some((a) => circlesOverlap(a.x, a.y, a.radius, ship.x, ship.y, SHIP_RADIUS * 0.7))) {
    endGame()
    return
  }

  // field cleared → next, bigger wave with the ship re-centred
  if (asteroids.length === 0) {
    wave.value += 1
    asteroids = spawnWave(3 + wave.value, field)
    ship = centeredShip(field)
    bullets = []
  }
}

const drawShip = (ctx: CanvasRenderingContext2D) => {
  ctx.save()
  ctx.translate(ship.x, ship.y)
  ctx.rotate(ship.angle)
  ctx.beginPath()
  ctx.moveTo(SHIP_RADIUS, 0)
  ctx.lineTo(-SHIP_RADIUS * 0.7, -SHIP_RADIUS * 0.7)
  ctx.lineTo(-SHIP_RADIUS * 0.4, 0)
  ctx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7)
  ctx.closePath()
  ctx.stroke()
  // a little exhaust flame while thrusting
  if (held.thrust) {
    ctx.beginPath()
    ctx.moveTo(-SHIP_RADIUS * 0.4, 0)
    ctx.lineTo(-SHIP_RADIUS * 1.1, 0)
    ctx.stroke()
  }
  ctx.restore()
}

const draw = (ctx: CanvasRenderingContext2D) => {
  ctx.clearRect(0, 0, field.width, field.height)
  ctx.lineWidth = 1.4
  ctx.strokeStyle = stroke
  ctx.fillStyle = stroke

  for (const a of asteroids) {
    ctx.save()
    ctx.translate(a.x, a.y)
    ctx.rotate(a.angle)
    ctx.beginPath()
    a.shape.forEach((r, i) => {
      const ang = (i / a.shape.length) * Math.PI * 2
      const px = Math.cos(ang) * a.radius * r
      const py = Math.sin(ang) * a.radius * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
  }

  for (const b of bullets) {
    ctx.beginPath()
    ctx.arc(b.x, b.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  if (!over.value) drawShip(ctx)
}

const { start: startLoop } = useCanvasScene(canvasRef, stageRef, {
  onResize: (ctx, w, h) => {
    field = { width: w, height: h }
    readColor()
    if (!inited && w > 10 && h > 10) init()
    draw(ctx)
  },
  onFrame: (ctx, dtMs) => {
    if (!over.value) update(Math.min(dtMs / 1000, 0.05))
    draw(ctx)
  }
})

const start = () => {
  init()
  startLoop()
  void nextTick(() => rootRef.value?.focus())
}

// keys are scoped to this window's focus (the tabindex root), so they never
// steal input from another front window or a focused field
const KEYMAP: Record<string, 'left' | 'right' | 'thrust'> = {
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
  arrowup: 'thrust', w: 'thrust'
}

const fire = () => {
  if (over.value || fireCooldown > 0 || bullets.length >= MAX_BULLETS) return
  bullets.push(fireBullet(ship))
  fireCooldown = FIRE_INTERVAL
}

const onKeydown = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  if (key === ' ' || key === 'spacebar') {
    fire()
    event.preventDefault()
    return
  }
  const action = KEYMAP[key]
  if (action) {
    held[action] = true
    event.preventDefault()
  }
}
const onKeyup = (event: KeyboardEvent) => {
  const action = KEYMAP[event.key.toLowerCase()]
  if (action) held[action] = false
}

// touch pad: press-and-hold rotate/thrust, tap to fire
const hold = (action: 'left' | 'right' | 'thrust', value: boolean) => {
  held[action] = value
}

watch(useColorMode(), () => readColor())

onMounted(() => {
  best.value = highscore.get()
  void nextTick(() => rootRef.value?.focus())
})
</script>

<style scoped lang="scss">
.dast {
  display: flex;
  flex-direction: column;
  height: 24rem;
  min-height: 15rem;
  outline: none;
}

.dast-hud {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 0.4rem;
  color: hsl(var(--lv-scheme-hs), 85%);
  font-size: 0.78rem;

  .dast-wave {
    color: hsl(var(--lv-scheme-hs), 55%);
  }

  .dast-best {
    margin-left: auto;
    color: var(--bulma-primary);
  }
}

.dast-stage {
  position: relative;
  flex: 1;
  overflow: hidden;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.2);
  border-radius: 2px;
  background-color: hsl(var(--lv-scheme-hs), 6%);
}

.dast-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.dast-over,
.dast-paused {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  text-align: center;
}

.dast-over {
  background-color: hsla(var(--lv-scheme-hs), 6%, 0.72);

  .dast-over-title {
    color: var(--bulma-primary);
    font-size: 1.1rem;
  }

  .dast-over-score {
    color: hsl(var(--lv-scheme-hs), 85%);
    font-size: 0.85rem;
  }

  .dast-over-best {
    color: hsl(var(--lv-scheme-hs), 85%);
    font-size: 0.78rem;
  }
}

.dast-paused {
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.8rem;
}

.dast-again {
  margin-top: 0.5rem;
  padding: 0.35rem 0.8rem;
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

.dast-hint {
  padding-top: 0.4rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.7rem;
}

.dast-pad {
  display: none;
  gap: 0.4rem;
  margin-top: 0.5rem;

  .dast-pad-btn {
    flex: 1;
    min-height: 2.8rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    font-size: 1rem;
    cursor: pointer;
    user-select: none;
  }

  .dast-pad-fire {
    color: var(--bulma-danger);
  }
}

@media (hover: none) and (pointer: coarse) {
  .dast-pad {
    display: flex;
  }
}
</style>
