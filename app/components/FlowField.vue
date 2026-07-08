<template>
  <div class="flow-field" aria-hidden="true" />
</template>

<script setup lang="ts">
// Background: a very subtle, slowly drifting dot-grid — two parallax layers of
// amber dots at low opacity. Pure CSS (no canvas/JS), so it costs nothing on the
// main thread and freezes cleanly under prefers-reduced-motion.
</script>

<style scoped lang="scss">
.flow-field {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  // two grids of dots at different scales for a faint sense of depth
  background-image:
    radial-gradient(circle, hsla(var(--lv-primary-hsl), 0.10) 1px, transparent 1.6px),
    radial-gradient(circle, hsla(var(--lv-primary-hsl), 0.05) 1px, transparent 1.6px);
  background-size: 30px 30px, 62px 62px;
  // fade the grid out toward the bottom so content stays clean
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.25) 70%, transparent 100%);
  animation: dot-drift 32s linear infinite;
}

@keyframes dot-drift {
  to {
    background-position: 30px 60px, -62px 31px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-field {
    animation: none;
  }
}
</style>
