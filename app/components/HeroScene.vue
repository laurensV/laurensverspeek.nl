<template>
  <div
    ref="containerRef"
    class="hero-scene"
    :class="{ 'is-dragging': isDragging }"
    title="Go ahead, give it a spin"
    aria-hidden="true"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  />
</template>

<script setup lang="ts">
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  IcosahedronGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  PointsMaterial,
  Points,
  Color,
  Group
} from 'three'
import { usePreferredReducedMotion, useDocumentVisibility, useResizeObserver } from '@vueuse/core'

// Wireframe icosahedron (a "block" of the chain) floating in the hero.
// Colors track the Bulma primary CSS variable so it follows the theme.

const containerRef = ref<HTMLElement>()
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const colorMode = useColorMode()

let renderer: WebGLRenderer | undefined
let scene: Scene | undefined
let camera: PerspectiveCamera | undefined
let group: Group | undefined
let inner: LineSegments | undefined
let rafId = 0
const materials: (LineBasicMaterial | PointsMaterial)[] = []

// drag-to-rotate state
const isDragging = ref(false)
let dragMoved = 0
let lastPointer = { x: 0, y: 0 }
let spin = { x: 0.0012, y: 0.0035 }
let pulse = 1
let pulseTarget = 1

const AUTO_SPIN = { x: 0.0012, y: 0.0035 }

const primaryColor = () => {
  const style = getComputedStyle(document.documentElement)
  const h = parseFloat(style.getPropertyValue('--bulma-primary-h')) || 45
  const s = parseFloat(style.getPropertyValue('--bulma-primary-s')) || 100
  const l = parseFloat(style.getPropertyValue('--bulma-primary-l')) || 50
  return new Color().setHSL(h / 360, s / 100, l / 100)
}

const build = () => {
  const container = containerRef.value
  if (!container) return

  scene = new Scene()
  camera = new PerspectiveCamera(45, 1, 0.1, 50)
  camera.position.z = 5.2

  group = new Group()
  scene.add(group)

  const color = primaryColor()
  const outerGeometry = new IcosahedronGeometry(1.9, 1)

  const outerMaterial = new LineBasicMaterial({ color, transparent: true, opacity: 0.55 })
  group.add(new LineSegments(new EdgesGeometry(outerGeometry), outerMaterial))

  const innerMaterial = new LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
  inner = new LineSegments(new EdgesGeometry(new IcosahedronGeometry(0.95, 0)), innerMaterial)
  group.add(inner)

  const dotsMaterial = new PointsMaterial({ color, size: 0.09, transparent: true, opacity: 0.9 })
  group.add(new Points(outerGeometry, dotsMaterial))

  materials.push(outerMaterial, innerMaterial, dotsMaterial)

  renderer = new WebGLRenderer({ alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)
  resize()
}

const resize = () => {
  const container = containerRef.value
  if (!container || !renderer || !camera) return
  const size = Math.min(container.clientWidth || 320, 400)
  renderer.setSize(size, size)
  renderFrame()
}

const renderFrame = () => {
  if (renderer && scene && camera) renderer.render(scene, camera)
}

const animate = () => {
  if (!group || !camera) return
  group.rotation.y += spin.y
  group.rotation.x += spin.x
  if (!isDragging.value) {
    // momentum decays back toward the idle auto-spin
    spin.x += (AUTO_SPIN.x - spin.x) * 0.02
    spin.y += (AUTO_SPIN.y - spin.y) * 0.02
  }
  if (inner) {
    inner.rotation.y -= 0.008
    inner.rotation.z += 0.004
  }
  // click pulse: scale bounces up and eases back
  pulse += (pulseTarget - pulse) * 0.12
  if (pulseTarget > 1 && pulse > pulseTarget - 0.02) pulseTarget = 1
  group.scale.setScalar(pulse)
  renderFrame()
  rafId = requestAnimationFrame(animate)
}

const start = () => {
  cancelAnimationFrame(rafId)
  if (reducedMotion.value === 'reduce') {
    renderFrame()
  } else if (visibility.value === 'visible') {
    rafId = requestAnimationFrame(animate)
  }
}

const onPointerDown = (event: PointerEvent) => {
  isDragging.value = true
  dragMoved = 0
  lastPointer = { x: event.clientX, y: event.clientY }
  containerRef.value?.setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return
  const dx = event.clientX - lastPointer.x
  const dy = event.clientY - lastPointer.y
  dragMoved += Math.abs(dx) + Math.abs(dy)
  lastPointer = { x: event.clientX, y: event.clientY }
  spin = { x: dy * 0.002, y: dx * 0.002 }
  if (reducedMotion.value === 'reduce' && group) {
    group.rotation.y += dx * 0.005
    group.rotation.x += dy * 0.005
    renderFrame()
  }
}

const onPointerUp = () => {
  if (isDragging.value && dragMoved < 6) {
    // it was a click, not a drag: pulse the block
    pulseTarget = 1.22
    spin = { x: AUTO_SPIN.x * 6, y: AUTO_SPIN.y * 8 }
  }
  isDragging.value = false
}

onMounted(() => {
  build()
  start()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  renderer?.dispose()
  renderer?.domElement.remove()
})

useResizeObserver(containerRef, resize)
watch([visibility, reducedMotion], start)
watch(
  () => colorMode.value,
  async () => {
    await nextTick()
    const color = primaryColor()
    for (const material of materials) material.color = color
    renderFrame()
  }
)
</script>

<style scoped>
.hero-scene {
  display: flex;
  justify-content: center;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
}

.hero-scene.is-dragging {
  cursor: grabbing;
}
</style>
