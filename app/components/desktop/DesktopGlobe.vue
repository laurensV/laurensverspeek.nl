<template>
  <div class="globe is-family-code">
    <p class="globe-head">
      🌍
      <span v-if="enabled">{{ count }} online · ◉ you, ● visitors by timezone</span>
      <span v-else>◉ you (no relay on this build)</span>
    </p>
    <pre class="globe-canvas" aria-hidden="true">{{ frame }}</pre>
    <p class="globe-note">a privacy-safe earth: only a UTC offset ever crosses the wire, never a location</p>
  </div>
</template>

<script setup lang="ts">
import { renderGlobe } from '~/utils/globe'

// The lvOS visitor globe: the same spinning earth the terminal `globe` command
// draws, plotting the SAME live-visitor geo (useVisitorGlobe → useLiveVisitors).
const GLOBE_W = 46
const GLOBE_H = 23

const { markers, enabled, count } = useVisitorGlobe()

const spin = ref(0)
const frame = computed(() => renderGlobe(spin.value, GLOBE_W, GLOBE_H, markers.value).join('\n'))

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return // a still earth for reduced-motion; markers still plot
  timer = setInterval(() => (spin.value += 0.08), 90)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped lang="scss">
.globe {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  min-width: min(22rem, 100%);
  max-width: 100%;
  font-size: 0.75rem;
}

.globe-head {
  color: hsl(var(--lv-scheme-hs), 80%);
}

.globe-canvas {
  margin: 0;
  // the ASCII globe is fixed-width; on a phone it can be wider than the window,
  // so scroll it inside its own box instead of letting the centered art clip
  // its own left edge off-screen
  max-width: 100%;
  overflow-x: auto;
  color: var(--bulma-primary);
  font-size: 0.72rem;
  line-height: 1;
  white-space: pre;
  background: none;
  border: none;
  padding: 0;
}

.globe-note {
  color: hsl(var(--lv-scheme-hs), 50%);
  font-size: 0.66rem;
  text-align: center;
}
</style>
