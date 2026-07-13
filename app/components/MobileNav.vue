<template>
  <nav class="mobile-nav is-family-code" :class="{ 'is-hidden-away': hidden }" aria-label="Primary, mobile">
    <NuxtLink to="/" class="mobile-nav-item" :class="{ 'is-active': route.path === '/' }">
      <AppIcon name="prompt" :size="18" />
      <span>home</span>
    </NuxtLink>
    <NuxtLink to="/projects" class="mobile-nav-item" :class="{ 'is-active': route.path.startsWith('/projects') }">
      <AppIcon name="layers" :size="18" />
      <span>projects</span>
    </NuxtLink>
    <NuxtLink to="/blog" class="mobile-nav-item" :class="{ 'is-active': route.path.startsWith('/blog') }">
      <AppIcon name="pen" :size="18" />
      <span>blog</span>
    </NuxtLink>
    <button class="mobile-nav-item" :class="{ 'is-active': isOpen }" @click="toggle">
      <AppIcon name="terminal" :size="18" />
      <span>terminal</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

// A thumb-reachable tab bar for phones: the top navbar stays for wayfinding,
// but the four everyday destinations live at the bottom where thumbs are.
// Slides away while scrolling down, returns on the first scroll up.

const route = useRoute()
const { isOpen, toggle } = useTerminal()

const hidden = ref(false)
let lastY = 0
useEventListener(import.meta.client ? window : null, 'scroll', () => {
  const y = window.scrollY
  // only react to meaningful movement, and never hide near the top
  if (Math.abs(y - lastY) > 12) {
    hidden.value = y > lastY && y > 120
    lastY = y
  }
}, { passive: true })
</script>

<style scoped lang="scss">
@use '~/assets/scss/mixins' as *;

.mobile-nav {
  position: fixed;
  // sits just above the status bar strip
  bottom: 1.65rem;
  left: 0;
  right: 0;
  z-index: 40;
  display: none;
  justify-content: space-around;
  padding: 0.25rem 0.5rem calc(0.25rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.18);
  transition: transform 0.25s ease;

  @include lv-glass(10%, 0.97, 0.86, 10px);

  @media (max-width: 768px) {
    display: flex;
  }

  &.is-hidden-away {
    transform: translateY(calc(100% + 1.65rem));
  }

  // the status bar strip below grows on touch, so sit above its taller height
  // (declared after the base rule so it wins on coarse pointers)
  @media (pointer: coarse) {
    bottom: 2.5rem;

    &.is-hidden-away {
      transform: translateY(calc(100% + 2.5rem));
    }
  }
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  min-width: 4rem;
  padding: 0.3rem 0.4rem;
  border: none;
  background: none;
  color: hsl(var(--lv-scheme-hs), 60%);
  font: inherit;
  font-size: 0.6rem;
  text-decoration: none;
  cursor: pointer;

  &.is-active {
    color: var(--bulma-primary);
  }
}

[data-theme='light'] .mobile-nav {
  @include lv-glass(96%, 0.97, 0.86, 10px);
}

@media (prefers-reduced-motion: reduce) {
  .mobile-nav {
    transition: none;
  }
}
</style>
