<template>
  <Transition name="wr-toast" appear>
    <div v-if="worldRecord" class="wr-toast is-family-code" role="status">
      <span class="wr-trophy" aria-hidden="true">🏆</span>
      <span class="wr-text">new world record — {{ label }}!</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// The banner half of the "beat the global #1" celebration (the confetti is
// ScoreCelebration). Lazily mounted on the shared worldRecord flag, which
// useLeaderboard sets when a submitted score tops the leaderboard; it clears the
// flag itself after a few seconds so the toast fades and unmounts.
const { worldRecord } = useSiteEffects()

// friendly names for the leaderboard game ids
const LABELS: Record<string, string> = {
  snake: 'snake',
  tetris: 'tetris',
  '2048': '2048',
  wpm: 'typing test',
  pong: 'pong'
}
const label = computed(() => LABELS[worldRecord.value] ?? worldRecord.value)

let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { timer = setTimeout(() => { worldRecord.value = '' }, 4200) })
onUnmounted(() => clearTimeout(timer))
</script>

<style scoped lang="scss">
.wr-toast {
  position: fixed;
  top: 4.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10075; /* above the confetti + lvOS chrome */
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: calc(100vw - 2rem);
  padding: 0.55rem 1rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.6);
  border-radius: var(--bulma-radius-large);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.97);
  color: hsl(var(--lv-primary-hsl));
  font-size: 0.82rem;
  font-weight: 600;
  box-shadow: 0 6px 30px hsla(var(--lv-primary-hsl), 0.25);
  pointer-events: none;
}

.wr-trophy {
  font-size: 1.1rem;
}

.wr-toast-enter-active,
.wr-toast-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.wr-toast-enter-from,
.wr-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-0.6rem);
}

@media (prefers-reduced-motion: reduce) {
  .wr-toast-enter-active,
  .wr-toast-leave-active {
    transition: opacity 0.35s ease;
  }

  .wr-toast-enter-from,
  .wr-toast-leave-to {
    transform: translateX(-50%);
  }
}
</style>
