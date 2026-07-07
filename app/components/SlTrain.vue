<template>
  <Teleport to="body">
    <div v-if="trainActive" class="sl-overlay" aria-hidden="true">
      <pre class="sl-train is-family-code" @animationend="trainActive = false">{{ SL_TRAIN }}</pre>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { SL_TRAIN } from '~/utils/terminalToys'

// The classic `sl` typo punishment: a steam locomotive crossing the page.
const trainActive = useState('fx-train', () => false)
</script>

<style scoped lang="scss">
.sl-overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  overflow: hidden;
  pointer-events: none;
}

.sl-train {
  position: absolute;
  top: 40%;
  left: 100vw;
  margin: 0;
  padding: 0;
  background: none;
  font-size: 0.8rem;
  line-height: 1.15;
  color: var(--bulma-text-strong);
  text-shadow: 0 0 8px hsla(var(--lv-primary-hsl), 0.4);
  animation: sl-drive 7s linear forwards;
}

@keyframes sl-drive {
  to {
    transform: translateX(calc(-100vw - 60ch));
  }
}

@media (prefers-reduced-motion: reduce) {
  .sl-train {
    animation-duration: 2.5s;
  }
}
</style>
