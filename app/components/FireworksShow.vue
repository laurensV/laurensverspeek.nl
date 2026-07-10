<template>
  <Teleport to="body">
    <div ref="overlayRef" class="fireworks-overlay" role="presentation">
      <canvas ref="canvasRef" aria-hidden="true" />
      <p class="fireworks-hint is-family-code">fireworks over {{ profile.domain }} — Esc (or kill 1231) ends the show</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { profile } from '~/data/profile'

// Canvas fireworks, started by the `fireworks` terminal command. Unlike the
// matrix overlay this one doesn't block the page: pointer events pass through
// and only Esc (or `kill 1231`) ends the show.

interface Rocket { x: number, y: number, vy: number, targetY: number, hue: number }
interface Spark { x: number, y: number, vx: number, vy: number, life: number, max: number, hue: number }

const { fireworksActive } = useSiteEffects()
const overlayRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()

let rockets: Rocket[] = []
let sparks: Spark[] = []
let vw = 0
let vh = 0
let sinceLaunch = 400 // first rocket goes up almost immediately

const launch = () => {
  rockets.push({
    x: vw * (0.1 + Math.random() * 0.8),
    y: vh,
    vy: -(7 + Math.random() * 3),
    targetY: vh * (0.15 + Math.random() * 0.3),
    // bias toward the site's amber, with the occasional wild color
    hue: Math.random() < 0.4 ? 42 : Math.floor(Math.random() * 360)
  })
}

const explode = (rocket: Rocket) => {
  const count = 60 + Math.floor(Math.random() * 30)
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2
    const speed = 1.5 + Math.random() * 3.5
    const max = 900 + Math.random() * 700
    sparks.push({
      x: rocket.x,
      y: rocket.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: max,
      max,
      hue: rocket.hue + Math.floor(Math.random() * 30) - 15
    })
  }
}

// alwaysAnimate: a deliberately-triggered effect (the command itself already
// falls back to ASCII art under reduced motion)
useCanvasScene(canvasRef, overlayRef, {
  onResize: (ctx, w, h) => {
    vw = w
    vh = h
    ctx.clearRect(0, 0, w, h)
    rockets = []
    sparks = []
  },
  onFrame: (ctx, dt) => {
    const step = Math.min(dt, 48) / 16 // normalize to ~60fps units, clamp jank
    sinceLaunch += dt
    if (sinceLaunch > 700 && rockets.length < 3) {
      sinceLaunch = 0
      launch()
      if (Math.random() < 0.35) launch() // sometimes two at once
    }

    // fade the previous frame out of the transparent canvas, then add light
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'
    ctx.fillRect(0, 0, vw, vh)
    ctx.globalCompositeOperation = 'lighter'

    rockets = rockets.filter((rocket) => {
      rocket.y += rocket.vy * step
      if (rocket.y <= rocket.targetY) {
        explode(rocket)
        return false
      }
      ctx.fillStyle = `hsla(${rocket.hue}, 100%, 70%, 0.9)`
      ctx.fillRect(rocket.x - 1, rocket.y, 2, 7)
      return true
    })

    sparks = sparks.filter((spark) => {
      spark.life -= dt
      if (spark.life <= 0) return false
      spark.vy += 0.045 * step // gravity pulls the bloom down
      spark.x += spark.vx * step
      spark.y += spark.vy * step
      const alpha = spark.life / spark.max
      ctx.fillStyle = `hsla(${spark.hue}, 100%, ${55 + alpha * 15}%, ${alpha})`
      ctx.fillRect(spark.x - 1, spark.y - 1, 2, 2)
      return true
    })
  }
}, { alwaysAnimate: true })

useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') fireworksActive.value = false
})
</script>

<style scoped lang="scss">
.fireworks-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  // the show plays over the page without hijacking it
  pointer-events: none;
  background-color: hsla(0, 0%, 0%, 0.45);

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .fireworks-hint {
    position: absolute;
    bottom: 1rem;
    width: 100%;
    text-align: center;
    font-size: 0.75rem;
    color: var(--bulma-primary);
    opacity: 0.65;
  }
}
</style>
