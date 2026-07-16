<template>
  <div ref="root" class="crosshair" aria-hidden="true">
    <div v-show="active" class="crosshair-line is-v" :style="{ transform: `translate3d(${x}px, 0, 0)` }" />
    <div v-show="active" class="crosshair-line is-h" :style="{ transform: `translate3d(0, ${y}px, 0)` }" />
    <div
      v-show="active"
      class="crosshair-readout is-family-code"
      :style="{ transform: `translate3d(${x}px, ${y}px, 0) translate(0.75rem, 0.75rem)` }"
    >
      x:{{ Math.round(x) }} y:{{ Math.round(y) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core'

// A developer crosshair that tracks the cursor across the hero, with a live
// coordinate readout — mouse only, and off entirely for reduced-motion.

const root = ref<HTMLElement>()
const x = ref(0)
const y = ref(0)
const active = ref(false)
const reducedMotion = usePreferredReducedMotion()

const enabled = computed(() => reducedMotion.value !== 'reduce')

const parent = () => root.value?.parentElement ?? undefined

// measuring the hero on every pointermove forced a synchronous reflow (the
// previous move dirtied layout via left/top) — cache the rect and re-measure
// only after a scroll/resize could have moved it
let heroRect: DOMRect | null = null
const invalidateRect = () => (heroRect = null)

const onMove = (event: PointerEvent) => {
  if (!enabled.value || event.pointerType !== 'mouse') return
  heroRect ??= parent()?.getBoundingClientRect() ?? null
  if (!heroRect) return
  x.value = event.clientX - heroRect.left
  y.value = event.clientY - heroRect.top
  active.value = true
}

const onLeave = () => (active.value = false)

onMounted(() => {
  const host = parent()
  if (!host) return
  useEventListener(host, 'pointermove', onMove, { passive: true })
  useEventListener(host, 'pointerleave', onLeave)
  useEventListener(window, 'scroll', invalidateRect, { passive: true })
  useEventListener(window, 'resize', invalidateRect, { passive: true })
})
</script>

<style scoped lang="scss">
.crosshair {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.crosshair-line {
  position: absolute;
  background-color: hsla(var(--lv-primary-hsl), 0.25);

  // anchored at 0 and moved by an inline transform, so tracking the pointer
  // composites instead of relayouting the hero per move
  &.is-v {
    inset: 0 auto 0 0;
    width: 1px;
  }

  &.is-h {
    inset: 0 0 auto;
    height: 1px;
  }
}

.crosshair-readout {
  position: absolute;
  inset: 0 auto auto 0;
  padding: 0.1rem 0.35rem;
  font-size: 0.68rem;
  color: var(--bulma-primary-on-scheme);
  background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-l), 0.7);
  border: 1px solid hsla(var(--lv-primary-hsl), 0.3);
  border-radius: 2px;
  white-space: nowrap;
}
</style>
