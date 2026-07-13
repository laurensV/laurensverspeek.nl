<template>
  <Transition name="nettoast">
    <p v-if="message" class="nettoast is-family-code" :class="{ 'is-back': online }" role="status">
      {{ message }}
    </p>
  </Transition>
</template>

<script setup lang="ts">
import { useOnline } from '@vueuse/core'

// The connection speaks up when it changes: a quiet terminal-styled line when
// the network drops (the PWA keeps cached pages working) and when it returns.
const online = useOnline()
const message = ref('')
let hideTimer: ReturnType<typeof setTimeout> | undefined

watch(online, (isOnline) => {
  message.value = isOnline
    ? '✓ back online'
    : '⚠ connection lost — cached pages still work'
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => (message.value = ''), isOnline ? 4_000 : 8_000)
})
onUnmounted(() => clearTimeout(hideTimer))
</script>

<style scoped lang="scss">
.nettoast {
  position: fixed;
  bottom: 2.4rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 0.45rem 0.9rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.97);
  color: hsl(var(--lv-primary-hsl));
  font-size: 0.72rem;

  &.is-back {
    border-color: hsla(var(--bulma-success-h), var(--bulma-success-s), var(--bulma-success-l), 0.5);
    color: var(--bulma-success);
  }
}

.nettoast-enter-active,
.nettoast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.nettoast-enter-from,
.nettoast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(0.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .nettoast-enter-active,
  .nettoast-leave-active {
    transition: none;
  }
}
</style>
