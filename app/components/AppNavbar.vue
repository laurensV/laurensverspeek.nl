<template>
  <nav class="app-navbar is-family-code" role="navigation" aria-label="main navigation">
    <div class="container nav-inner">
      <NuxtLink
        to="/"
        class="nav-brand"
        @mouseenter="scramble($event.currentTarget as HTMLElement, '~/laurens')"
      >~/laurens</NuxtLink>

      <button
        class="nav-toggle is-hidden-desktop"
        :aria-expanded="mobileMenu"
        aria-label="menu"
        @click="mobileMenu = !mobileMenu"
      >
        {{ mobileMenu ? '[close]' : '[menu]' }}
      </button>

      <div class="nav-links" :class="{ 'is-open': mobileMenu }">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          class="nav-link"
          :to="item.to"
          exact-active-class="is-active"
          @click="mobileMenu = false"
          @mouseenter="scramble($event.currentTarget as HTMLElement, item.label)"
        >{{ item.label }}</NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
const mobileMenu = ref(false)

const navItems = [
  { to: '/', label: 'home' },
  { to: '/projects', label: 'projects' },
  { to: '/blog', label: 'blog' },
  { to: '/about', label: 'about' },
  { to: '/uses', label: 'uses' },
  { to: '/contact', label: 'contact' }
]

// hover effect: characters cycle through glyphs and "decode" into the label.
// ASCII-only set: exotic glyphs can fall back to a non-mono font and shift widths.
const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&'
const timers = new WeakMap<HTMLElement, ReturnType<typeof setInterval>>()

const scramble = (el: HTMLElement, text: string) => {
  const existing = timers.get(el)
  if (existing) clearInterval(existing)

  // lock the current width so random glyphs can never shift the layout
  el.style.width = `${el.getBoundingClientRect().width}px`
  el.style.display = 'inline-block'

  let frame = 0
  const totalFrames = text.length * 2 + 4
  const timer = setInterval(() => {
    frame++
    const settled = Math.floor((frame / totalFrames) * text.length)
    el.textContent = [...text]
      .map((ch, i) =>
        i < settled || ch === ' '
          ? ch
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      )
      .join('')
    if (frame >= totalFrames) {
      el.textContent = text
      el.style.width = ''
      el.style.display = ''
      clearInterval(timer)
      timers.delete(el)
    }
  }, 28)
  timers.set(el, timer)
}
</script>

<style scoped lang="scss">
.app-navbar {
  position: sticky;
  top: 0;
  z-index: 30;
  background-color: hsla(
    var(--bulma-scheme-h),
    var(--bulma-scheme-s),
    var(--bulma-scheme-main-l),
    0.72
  );
  backdrop-filter: blur(12px);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 3.25rem;
  padding: 0 1rem;
  font-size: 0.85rem;
  // JetBrains Mono ligatures merge pairs like <> and => into single glyphs,
  // which makes the scramble animation change width — disable them here
  font-variant-ligatures: none;
  font-feature-settings: 'liga' 0, 'calt' 0;
}

.nav-brand {
  color: var(--bulma-text-weak);
  white-space: pre;

  &:hover {
    color: var(--bulma-primary-on-scheme);
  }
}

.nav-toggle {
  border: none;
  background: none;
  font: inherit;
  color: var(--bulma-text);
  cursor: pointer;

  &:hover {
    color: var(--bulma-primary-on-scheme);
  }
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.75rem;

  .nav-link {
    position: relative;
    color: var(--bulma-text-weak);
    white-space: pre;
    transition: color 0.2s ease;

    // blinking cursor after the active page
    &::after {
      content: '_';
      position: absolute;
      color: var(--bulma-primary-on-scheme);
      opacity: 0;
    }

    &:hover {
      color: var(--bulma-text-strong);
    }

    &.is-active {
      color: var(--bulma-primary-on-scheme);

      &::after {
        opacity: 1;
        animation: nav-cursor 1.1s steps(2, start) infinite;
      }
    }
  }
}

@keyframes nav-cursor {
  to {
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-links .nav-link.is-active::after {
    animation: none;
  }
}

// mobile: full-width dropdown under the bar
@media screen and (max-width: 1023px) {
  .nav-links {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    padding: 0.5rem 1rem 1rem;
    background-color: var(--bulma-scheme-main);
    border-bottom: 1px solid var(--bulma-border-weak);
    display: none;

    &.is-open {
      display: flex;
    }

    .nav-link {
      padding: 0.6rem 0;
      width: 100%;
    }
  }
}
</style>
