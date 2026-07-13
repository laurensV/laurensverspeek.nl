<template>
  <Transition name="pwa-in">
    <div v-if="visible" class="pwa-install is-family-code no-print" role="dialog" aria-label="Install this site as an app">
      <span class="pwa-glyph" aria-hidden="true">⤓</span>
      <span class="pwa-text">install lvOS as an app?</span>
      <button class="pwa-yes" @click="install">install</button>
      <button class="pwa-no" aria-label="Dismiss" @click="dismiss">✕</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

// beforeinstallprompt isn't in the standard lib types
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'lv-pwa-dismissed'
const deferred = ref<InstallPromptEvent | null>(null)
const visible = ref(false)

// Chrome/Edge/Android fire this when the PWA is installable; stash it so a tap
// can replay the native prompt. Never show it again once the visitor waved it off.
useEventListener(window, 'beforeinstallprompt', (event: Event) => {
  event.preventDefault()
  if (storageGet(DISMISS_KEY) === '1') return
  deferred.value = event as InstallPromptEvent
  visible.value = true
})

// installed (from our chip or the browser UI): drop the offer
useEventListener(window, 'appinstalled', () => {
  visible.value = false
  deferred.value = null
  storageSet(DISMISS_KEY, '1')
})

const install = async () => {
  const event = deferred.value
  visible.value = false
  if (!event) return
  await event.prompt()
  await event.userChoice
  deferred.value = null
}

const dismiss = () => {
  visible.value = false
  deferred.value = null
  storageSet(DISMISS_KEY, '1')
}
</script>

<style scoped lang="scss">
.pwa-install {
  position: fixed;
  // clear of the status bar (and the mobile tab bar riding above it)
  bottom: calc(2.4rem + env(safe-area-inset-bottom, 0px));
  right: 0.75rem;
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: calc(100vw - 1.5rem);
  padding: 0.45rem 0.6rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-bis-l), 0.96);
  backdrop-filter: blur(8px);
  font-size: 0.78rem;
  box-shadow: 0 4px 16px hsla(var(--lv-scheme-hs), 4%, 0.35);

  @media (max-width: 768px) {
    bottom: calc(2.4rem + 3.4rem + env(safe-area-inset-bottom, 0px));
  }
}

.pwa-glyph {
  color: var(--bulma-primary);
}

.pwa-text {
  color: var(--bulma-text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pwa-yes {
  border: 1px solid hsla(var(--lv-primary-hsl), 0.6);
  border-radius: var(--bulma-radius-small);
  background: hsla(var(--lv-primary-hsl), 0.12);
  padding: 0.15rem 0.55rem;
  color: var(--bulma-primary-on-scheme);
  font: inherit;
  cursor: pointer;

  &:hover {
    background: hsla(var(--lv-primary-hsl), 0.22);
  }
}

.pwa-no {
  border: none;
  background: none;
  padding: 0.15rem 0.25rem;
  color: var(--bulma-text-weak);
  font: inherit;
  cursor: pointer;

  &:hover {
    color: var(--bulma-text-strong);
  }
}

.pwa-in-enter-active,
.pwa-in-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.pwa-in-enter-from,
.pwa-in-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .pwa-in-enter-active,
  .pwa-in-leave-active {
    transition: none;
  }
}
</style>
