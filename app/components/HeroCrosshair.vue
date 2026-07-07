<template>
  <div ref="root" class="crosshair" aria-hidden="true">
    <div v-show="active" class="crosshair-line is-v" :style="{ left: `${x}px` }" />
    <div v-show="active" class="crosshair-line is-h" :style="{ top: `${y}px` }" />
    <div
      v-show="active"
      class="crosshair-readout is-family-code"
      :style="{ left: `${x}px`, top: `${y}px` }"
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

const onMove = (event: PointerEvent) => {
  if (!enabled.value || event.pointerType !== 'mouse') return
  const rect = parent()?.getBoundingClientRect()
  if (!rect) return
  x.value = event.clientX - rect.left
  y.value = event.clientY - rect.top
  active.value = true
}

const onLeave = () => (active.value = false)

onMounted(() => {
  const host = parent()
  if (!host) return
  useEventListener(host, 'pointermove', onMove, { passive: true })
  useEventListener(host, 'pointerleave', onLeave)
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

  &.is-v {
    top: 0;
    bottom: 0;
    width: 1px;
  }

  &.is-h {
    left: 0;
    right: 0;
    height: 1px;
  }
}

.crosshair-readout {
  position: absolute;
  transform: translate(0.75rem, 0.75rem);
  padding: 0.1rem 0.35rem;
  font-size: 0.68rem;
  color: var(--bulma-primary-on-scheme);
  background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-l), 0.7);
  border: 1px solid hsla(var(--lv-primary-hsl), 0.3);
  border-radius: 2px;
  white-space: nowrap;
}
</style>
