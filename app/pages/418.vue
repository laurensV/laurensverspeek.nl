<template>
  <section class="section">
    <div class="container teapot-container">
      <p class="overline mb-2">HTCPCP/1.0 418</p>
      <h1 class="title is-2 mb-2">I'm a teapot</h1>
      <p class="subtitle is-5 has-text-grey mb-4">
        The requested entity is short and stout. Coffee will not be brewed here.
      </p>

      <pre
        ref="potRef"
        class="teapot is-family-code"
        :class="{ 'is-dragging': dragging }"
        aria-label="An interactive spinning ASCII teapot"
        @pointerdown.prevent="onDown"
      >{{ frame }}</pre>
      <p class="is-family-code is-size-7 has-text-grey teapot-hint">
        // drag to pour · {{ spinning ? 'spinning at 1 rpm-ish' : 'motion reduced — drag still works' }}
      </p>

      <div class="content mt-5 teapot-body">
        <p>
          This page implements <a href="https://www.rfc-editor.org/rfc/rfc2324" target="_blank" rel="noopener">RFC 2324</a>,
          the Hyper Text Coffee Pot Control Protocol. Any attempt to brew coffee with this website
          returns status <code>418 I'm a teapot</code>, because this website is, demonstrably, a teapot.
        </p>
        <p class="is-family-code is-size-7 has-text-grey">
          tip: ask the terminal for <code>coffee</code> and see how it takes it.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { teapotPoints, renderTeapot } from '~/utils/teapot'

const ogImage = `${SITE_URL}/og/page-418.svg`
useHead({ title: "418 I'm a teapot — Laurens Verspeek" })
useSeoMeta({
  description: "RFC 2324, faithfully implemented: an interactive ASCII teapot. Coffee will not be brewed.",
  ogTitle: "418 — I'm a teapot",
  ogUrl: `${SITE_URL}/418`,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterImage: ogImage
})

const points = teapotPoints()
const angleY = ref(0.6)
const angleX = ref(0.22)
const frame = ref(renderTeapot(points, angleY.value, angleX.value))
const potRef = ref<HTMLElement>()
const dragging = ref(false)
const spinning = ref(true)

let raf = 0
let last = 0
const loop = (t: number) => {
  const dt = Math.min(t - last, 100)
  last = t
  if (!dragging.value && spinning.value) angleY.value += dt * 0.0008
  frame.value = renderTeapot(points, angleY.value, angleX.value)
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  spinning.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  last = performance.now()
  // under reduced motion there's no idle spin, but drags still re-render
  raf = requestAnimationFrame(loop)
})
onUnmounted(() => cancelAnimationFrame(raf))

// drag to pour: horizontal spins, vertical tips (clamped so it never flips)
let grab = { x: 0, y: 0, ay: 0, ax: 0 }
const onDown = (event: PointerEvent) => {
  dragging.value = true
  grab = { x: event.clientX, y: event.clientY, ay: angleY.value, ax: angleX.value }
  potRef.value?.setPointerCapture(event.pointerId)
}
useEventListener('pointermove', (event: PointerEvent) => {
  if (!dragging.value) return
  angleY.value = grab.ay + (event.clientX - grab.x) * 0.012
  angleX.value = Math.max(-1.2, Math.min(1.2, grab.ax + (event.clientY - grab.y) * 0.01))
})
useEventListener('pointerup', () => (dragging.value = false))
</script>

<style scoped lang="scss">
.teapot-container {
  max-width: 46rem;
}

.teapot {
  margin: 0;
  padding: 1rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.35);
  border-radius: var(--bulma-radius-large);
  background: none;
  color: var(--bulma-primary-on-scheme);
  font-size: clamp(0.5rem, 1.9vw, 0.85rem);
  line-height: 1.05;
  cursor: grab;
  user-select: none;
  touch-action: none;
  overflow-x: auto;

  &.is-dragging {
    cursor: grabbing;
  }
}

.teapot-hint {
  margin-top: 0.5rem;
}

.teapot-body {
  max-width: 38rem;
}
</style>
