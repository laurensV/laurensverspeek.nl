<template>
  <div
    ref="containerRef"
    class="hero-constellation"
    aria-hidden="true"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <canvas ref="canvasRef" class="hero-constellation-canvas" />
  </div>
</template>

<script setup lang="ts">
import { usePreferredReducedMotion, useDocumentVisibility, useResizeObserver } from '@vueuse/core'

// A cursor-reactive particle constellation: nodes drift and link to their
// neighbours, and reach toward the pointer. Pure 2D canvas — no WebGL, no
// three.js. Colours track the Bulma primary variable so it follows the theme.

const containerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const colorMode = useColorMode()

interface Node { x: number, y: number, vx: number, vy: number }

let ctx: CanvasRenderingContext2D | null = null
let nodes: Node[] = []
let rafId = 0
let width = 0
let height = 0
let dpr = 1

const pointer = { x: 0, y: 0, active: false }

const LINK_DIST = 118
const POINTER_DIST = 170
const SPEED = 0.22

// read the theme's primary HSL once, hand back an hsla() string builder
let hsl = { h: 45, s: 100, l: 50 }
const readColor = () => {
  const style = getComputedStyle(document.documentElement)
  hsl = {
    h: parseFloat(style.getPropertyValue('--bulma-primary-h')) || 45,
    s: parseFloat(style.getPropertyValue('--bulma-primary-s')) || 100,
    l: parseFloat(style.getPropertyValue('--bulma-primary-l')) || 50
  }
}
const stroke = (a: number) => `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})`

const seed = () => {
  // ~1 node per 5.5k px², clamped, so density is stable across sizes
  const count = Math.max(14, Math.min(48, Math.round((width * height) / 5500)))
  nodes = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * SPEED,
    vy: (Math.random() - 0.5) * SPEED
  }))
}

const resize = () => {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = container.clientWidth
  height = container.clientHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (!nodes.length) seed()
  draw()
}

const step = () => {
  for (const n of nodes) {
    n.x += n.vx
    n.y += n.vy
    if (n.x < 0 || n.x > width) n.vx *= -1
    if (n.y < 0 || n.y > height) n.vy *= -1
    // gentle drift toward the pointer when it's nearby
    if (pointer.active) {
      const dx = pointer.x - n.x
      const dy = pointer.y - n.y
      const d = Math.hypot(dx, dy)
      if (d < POINTER_DIST && d > 0.5) {
        n.x += (dx / d) * 0.18
        n.y += (dy / d) * 0.18
      }
    }
  }
}

const draw = () => {
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)

  // links between neighbouring nodes
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]!
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d < LINK_DIST) {
        ctx.strokeStyle = stroke(0.16 * (1 - d / LINK_DIST))
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
  }

  // brighter links from the pointer to nearby nodes
  if (pointer.active) {
    for (const n of nodes) {
      const d = Math.hypot(pointer.x - n.x, pointer.y - n.y)
      if (d < POINTER_DIST) {
        ctx.strokeStyle = stroke(0.5 * (1 - d / POINTER_DIST))
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(pointer.x, pointer.y)
        ctx.lineTo(n.x, n.y)
        ctx.stroke()
      }
    }
  }

  // the nodes themselves
  for (const n of nodes) {
    ctx.fillStyle = stroke(0.85)
    ctx.beginPath()
    ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
}

const animate = () => {
  step()
  draw()
  rafId = requestAnimationFrame(animate)
}

const start = () => {
  cancelAnimationFrame(rafId)
  if (reducedMotion.value === 'reduce') draw()
  else if (visibility.value === 'visible') rafId = requestAnimationFrame(animate)
}

const onPointerMove = (event: PointerEvent) => {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  pointer.x = event.clientX - rect.left
  pointer.y = event.clientY - rect.top
  pointer.active = true
  // reduced motion: no loop, so repaint on interaction to keep it reactive
  if (reducedMotion.value === 'reduce') draw()
}

const onPointerLeave = () => {
  pointer.active = false
  if (reducedMotion.value === 'reduce') draw()
}

onMounted(() => {
  readColor()
  resize()
  start()
})

onBeforeUnmount(() => cancelAnimationFrame(rafId))

useResizeObserver(containerRef, resize)
watch([visibility, reducedMotion], start)
watch(
  () => colorMode.value,
  async () => {
    await nextTick()
    readColor()
    draw()
  }
)
</script>

<style scoped>
.hero-constellation {
  width: 100%;
  height: 22rem;
  max-width: 26rem;
  margin-inline: auto;
  touch-action: pan-y;
}

.hero-constellation-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
