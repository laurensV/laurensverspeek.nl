<template>
  <Teleport to="body">
    <div v-if="active" class="party-overlay" aria-hidden="true">
      <canvas ref="canvasRef" />
      <p class="party-banner is-family-code">↑↑↓↓←→←→BA — cheat mode activated 🎉</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useEventListener, useWindowSize, usePreferredReducedMotion } from '@vueuse/core'

// The Konami code easter egg: confetti + a short site-wide hue party.

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']
const PARTY_MS = 6000

interface Confetto {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vrot: number
  size: number
  color: string
}

const active = useState(STATE_KEYS.fxParty, () => false)
const canvasRef = ref<HTMLCanvasElement>()
const { width, height } = useWindowSize()
const reducedMotion = usePreferredReducedMotion()

let progress = 0
let confetti: Confetto[] = []
let rafId = 0
let stopTimer: ReturnType<typeof setTimeout> | undefined

const confettiColors = () => {
  const style = getComputedStyle(document.documentElement)
  return ['--bulma-primary', '--bulma-info', '--bulma-success', '--bulma-danger', '--bulma-warning']
    .map((name) => style.getPropertyValue(name).trim())
    .filter(Boolean)
}

// external triggers (like the `party` command) just flip the state
watch(active, (on) => {
  if (on) begin()
  else stop()
})

const start = () => {
  if (active.value) return
  active.value = true
}

const begin = () => {
  document.documentElement.classList.add('party-mode')

  nextTick(() => {
    const canvas = canvasRef.value
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = width.value
    canvas.height = height.value

    const colors = confettiColors()
    confetti = Array.from({ length: reducedMotion.value === 'reduce' ? 0 : 180 }, () => ({
      x: Math.random() * width.value,
      y: -20 - Math.random() * height.value * 0.5,
      vx: (Math.random() - 0.5) * 2.5,
      vy: 2 + Math.random() * 3.5,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.25,
      size: 5 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)]!
    }))

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const c of confetti) {
        c.x += c.vx
        c.y += c.vy
        c.rot += c.vrot
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate(c.rot)
        ctx.fillStyle = c.color
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2)
        ctx.restore()
      }
      rafId = requestAnimationFrame(tick)
    }
    tick()
  })

  stopTimer = setTimeout(stop, PARTY_MS)
}

const stop = () => {
  clearTimeout(stopTimer)
  cancelAnimationFrame(rafId)
  document.documentElement.classList.remove('party-mode')
  if (active.value) active.value = false
}

useEventListener('keydown', (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0
  if (progress === KONAMI.length) {
    progress = 0
    start()
  }
})

onBeforeUnmount(stop)
</script>

<style scoped lang="scss">
.party-overlay {
  position: fixed;
  inset: 0;
  z-index: 160;
  pointer-events: none;

  canvas {
    display: block;
  }
}

.party-banner {
  position: absolute;
  bottom: 3rem;
  width: 100%;
  text-align: center;
  font-size: 0.85rem;
  color: var(--bulma-primary);
  text-shadow: 0 0 14px hsla(var(--lv-primary-hsl), 0.7);
}
</style>
