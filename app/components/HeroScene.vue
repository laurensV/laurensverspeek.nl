<template>
  <div ref="containerRef" class="hero-scene" aria-hidden="true" />
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
const pointer = { x: 0, y: 0 }
const materials: (LineBasicMaterial | PointsMaterial)[] = []

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
  group.rotation.y += 0.0035
  group.rotation.x += 0.0012
  if (inner) {
    inner.rotation.y -= 0.008
    inner.rotation.z += 0.004
  }
  // ease the camera toward the pointer for a parallax feel
  camera.position.x += (pointer.x * 0.7 - camera.position.x) * 0.04
  camera.position.y += (-pointer.y * 0.5 - camera.position.y) * 0.04
  camera.lookAt(0, 0, 0)
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

const onPointerMove = (event: PointerEvent) => {
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2
  pointer.y = (event.clientY / window.innerHeight - 0.5) * 2
}

onMounted(() => {
  build()
  start()
  window.addEventListener('pointermove', onPointerMove, { passive: true })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('pointermove', onPointerMove)
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
  pointer-events: none;
}
</style>
