<template>
  <canvas ref="canvasRef" class="flow-field" aria-hidden="true" />
</template>

<script setup lang="ts">
import { useWindowSize, usePreferredReducedMotion, useDocumentVisibility } from '@vueuse/core'

// Background: particles drifting along an animated vector field, leaving fading
// trails. The cursor acts as a small vortex. Colors come from Bulma's CSS
// variables so the field follows the active theme.

interface Particle {
  x: number
  y: number
  life: number
}

const canvasRef = ref<HTMLCanvasElement>()
const { width, height } = useWindowSize()
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const colorMode = useColorMode()

const SPEED = 1.1
const VORTEX_RADIUS = 170

let particles: Particle[] = []
let rafId = 0
let time = 0
let strokeStyles: string[] = []
const mouse = { x: -1e4, y: -1e4 }

const readThemeColors = () => {
  const style = getComputedStyle(document.documentElement)
  const h = parseFloat(style.getPropertyValue('--bulma-primary-h')) || 45
  const s = parseFloat(style.getPropertyValue('--bulma-primary-s')) || 100
  const l = parseFloat(style.getPropertyValue('--bulma-primary-l')) || 50
  // mostly brand-colored streaks, a few neutral ones for depth
  strokeStyles = [
    `hsla(${h}, ${s}%, ${l}%, 0.20)`,
    `hsla(${h}, ${s}%, ${l}%, 0.13)`,
    `hsla(${h}, ${Math.max(0, s - 60)}%, ${l}%, 0.10)`
  ]
}

// layered sines make a cheap, smooth, time-evolving vector field
const fieldAngle = (x: number, y: number, t: number) => {
  return (
    (Math.sin(x * 0.0016 + t * 0.11)
      + Math.cos(y * 0.0014 - t * 0.08)
      + Math.sin((x + y) * 0.0007 + t * 0.05)) * Math.PI * 0.75
  )
}

const spawn = (): Particle => ({
  x: Math.random() * width.value,
  y: Math.random() * height.value,
  life: 80 + Math.random() * 220
})

const createParticles = () => {
  const count = Math.min(320, Math.max(90, Math.round((width.value * height.value) / 6200)))
  particles = Array.from({ length: count }, spawn)
}

const step = (ctx: CanvasRenderingContext2D) => {
  time += 0.016

  // fade existing trails toward transparent (canvas itself stays see-through)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.045)'
  ctx.fillRect(0, 0, width.value, height.value)
  ctx.globalCompositeOperation = 'source-over'

  ctx.lineWidth = 1
  particles.forEach((p, i) => {
    const angle = fieldAngle(p.x, p.y, time)
    let vx = Math.cos(angle) * SPEED
    let vy = Math.sin(angle) * SPEED

    // the cursor stirs a small vortex into the field
    const dx = p.x - mouse.x
    const dy = p.y - mouse.y
    const dist = Math.hypot(dx, dy)
    if (dist < VORTEX_RADIUS && dist > 1) {
      const force = (1 - dist / VORTEX_RADIUS) * 2.2
      vx += (-dy / dist) * force + (dx / dist) * force * 0.35
      vy += (dx / dist) * force + (dy / dist) * force * 0.35
    }

    const nx = p.x + vx
    const ny = p.y + vy

    ctx.strokeStyle = strokeStyles[i % strokeStyles.length]!
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(nx, ny)
    ctx.stroke()

    p.x = nx
    p.y = ny
    p.life--

    if (p.life <= 0 || p.x < -20 || p.x > width.value + 20 || p.y < -20 || p.y > height.value + 20) {
      particles[i] = spawn()
    }
  })
}

const loop = () => {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  step(ctx)
  rafId = requestAnimationFrame(loop)
}

const drawStatic = (ctx: CanvasRenderingContext2D) => {
  // reduced motion: one quiet, frozen pass of the field
  ctx.clearRect(0, 0, width.value, height.value)
  ctx.lineWidth = 1
  particles.forEach((p, i) => {
    ctx.strokeStyle = strokeStyles[i % strokeStyles.length]!
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    let { x, y } = p
    for (let s = 0; s < 14; s++) {
      const angle = fieldAngle(x, y, 0)
      x += Math.cos(angle) * 2.4
      y += Math.sin(angle) * 2.4
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  })
}

const start = () => {
  cancelAnimationFrame(rafId)
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  canvas.width = width.value
  canvas.height = height.value
  if (reducedMotion.value === 'reduce') {
    drawStatic(ctx)
  } else if (visibility.value === 'visible') {
    loop()
  }
}

const onPointerMove = (event: PointerEvent) => {
  mouse.x = event.clientX
  mouse.y = event.clientY
}
const onPointerLeave = () => {
  mouse.x = -1e4
  mouse.y = -1e4
}

onMounted(() => {
  readThemeColors()
  createParticles()
  start()
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onPointerLeave)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('pointermove', onPointerMove)
  document.documentElement.removeEventListener('pointerleave', onPointerLeave)
})

watch([width, height], () => {
  createParticles()
  start()
})
watch([visibility, reducedMotion], start)
watch(
  () => colorMode.value,
  async () => {
    await nextTick()
    readThemeColors()
    const ctx = canvasRef.value?.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, width.value, height.value)
  }
)
</script>

<style scoped>
.flow-field {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
