<template>
  <canvas ref="canvasRef" class="particle-network" aria-hidden="true" />
</template>

<script setup lang="ts">
import { useWindowSize, usePreferredReducedMotion, useDocumentVisibility } from '@vueuse/core'

// Animated network of connected nodes (a nod to blockchain) drawn behind the page.
// Colors are read from Bulma's CSS variables so the canvas follows the active theme.

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

const canvasRef = ref<HTMLCanvasElement>()
const { width, height } = useWindowSize()
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const colorMode = useColorMode()

const LINK_DISTANCE = 140
const MOUSE_DISTANCE = 200

let nodes: Node[] = []
let rafId = 0
let nodeColor = ''
let primaryHsl = { h: 45, s: 100, l: 50 }
const mouse = { x: -1e4, y: -1e4 }

const readThemeColors = () => {
  const style = getComputedStyle(document.documentElement)
  const h = parseFloat(style.getPropertyValue('--bulma-primary-h')) || 45
  const s = parseFloat(style.getPropertyValue('--bulma-primary-s')) || 100
  const l = parseFloat(style.getPropertyValue('--bulma-primary-l')) || 50
  primaryHsl = { h, s, l }
  nodeColor = `hsla(${h}, ${s}%, ${l}%, 0.55)`
}

const createNodes = () => {
  const count = Math.min(90, Math.max(30, Math.round((width.value * height.value) / 22000)))
  nodes = Array.from({ length: count }, () => ({
    x: Math.random() * width.value,
    y: Math.random() * height.value,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    radius: 1 + Math.random() * 1.6
  }))
}

const draw = (ctx: CanvasRenderingContext2D, animate: boolean) => {
  const w = width.value
  const h = height.value
  ctx.clearRect(0, 0, w, h)

  for (const node of nodes) {
    if (animate) {
      node.x += node.vx
      node.y += node.vy
      if (node.x < 0 || node.x > w) node.vx *= -1
      if (node.y < 0 || node.y > h) node.vy *= -1
    }
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
    ctx.fillStyle = nodeColor
    ctx.fill()
  }

  const { h: ph, s: ps, l: pl } = primaryHsl
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]!
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dist = Math.hypot(dx, dy)
      if (dist < LINK_DISTANCE) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `hsla(${ph}, ${ps}%, ${pl}%, ${0.14 * (1 - dist / LINK_DISTANCE)})`
        ctx.stroke()
      }
    }
    // Connect nodes near the cursor for a bit of interactivity
    const md = Math.hypot(a.x - mouse.x, a.y - mouse.y)
    if (md < MOUSE_DISTANCE) {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(mouse.x, mouse.y)
      ctx.strokeStyle = `hsla(${ph}, ${ps}%, ${pl}%, ${0.22 * (1 - md / MOUSE_DISTANCE)})`
      ctx.stroke()
    }
  }
}

const loop = () => {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  draw(ctx, true)
  rafId = requestAnimationFrame(loop)
}

const start = () => {
  cancelAnimationFrame(rafId)
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  canvas.width = width.value
  canvas.height = height.value
  if (reducedMotion.value === 'reduce') {
    draw(ctx, false)
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
  createNodes()
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
  createNodes()
  start()
})
watch([visibility, reducedMotion], start)
watch(
  () => colorMode.value,
  async () => {
    await nextTick()
    readThemeColors()
  }
)
</script>

<style scoped>
.particle-network {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
