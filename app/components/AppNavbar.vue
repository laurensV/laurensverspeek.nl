<template>
  <nav
    class="app-navbar is-family-code"
    :class="{ 'is-scrolled': scrolled }"
    role="navigation"
    aria-label="main navigation"
  >
    <div class="container nav-inner">
      <NuxtLink
        to="/"
        class="nav-brand"
        :class="{ 'is-expanded': brandExpanded, 'is-typing': brandTyping }"
        aria-label="home"
        @mouseenter="expandBrand(true)"
        @mouseleave="expandBrand(false)"
      >
        <span class="brand-path">{{ brandText }}</span><span class="brand-caret" aria-hidden="true" /><span class="brand-git">git:(master)</span>
      </NuxtLink>

      <div class="nav-links is-hidden-touch">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          class="nav-link"
          :to="item.to"
          exact-active-class="is-active"
          @mouseenter="scramble($event.currentTarget as HTMLElement, item.label)"
        >{{ item.label }}</NuxtLink>
        <button class="nav-search" aria-label="Search (Ctrl+K)" title="Search — Ctrl+K" @click="palette.open()">
          <AppIcon name="search" :size="14" />
          <span class="nav-search-kbd">⌘K</span>
        </button>
      </div>

      <button
        class="nav-toggle is-hidden-desktop"
        :aria-expanded="mobileMenu"
        aria-label="menu"
        @click="mobileMenu = !mobileMenu"
      >
        {{ mobileMenu ? '[close]' : '[menu]' }}
      </button>
    </div>

    <!-- full-screen mobile menu -->
    <Transition name="mobile-menu">
      <div v-if="mobileMenu" class="mobile-menu is-hidden-desktop">
        <button class="mobile-search" @click="openPalette">
          <AppIcon name="search" :size="16" />
          <span>search everything…</span>
          <span class="mobile-search-kbd">⌘K</span>
        </button>
        <NuxtLink
          v-for="(item, i) in navItems"
          :key="item.to"
          class="mobile-link"
          :style="{ '--i': i }"
          :to="item.to"
          exact-active-class="is-active"
          @click="mobileMenu = false"
        >
          <span class="mobile-link-index">0{{ i + 1 }}</span>
          {{ item.label }}
        </NuxtLink>
        <div class="mobile-footer">
          <button class="mobile-action" @click="openTerminal">>_ terminal</button>
          <a
            v-for="social in profile.socials"
            :key="social.label"
            :href="social.url"
            target="_blank"
            rel="noopener"
            class="mobile-action"
          >{{ social.label.toLowerCase() }}</a>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { profile } from '~/data/profile'

const mobileMenu = ref(false)
const palette = useCommandPalette()
const terminal = useTerminal()

// scroll-aware divider: the bar grows a hairline + shadow once you leave the top
const scrolled = ref(false)
useEventListener('scroll', () => {
  scrolled.value = window.scrollY > 12
}, { passive: true })

const openPalette = () => {
  mobileMenu.value = false
  palette.open()
}
const openTerminal = () => {
  mobileMenu.value = false
  terminal.open()
}

// lock body scroll while the full-screen menu is open
watch(mobileMenu, (open) => {
  if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
})
onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

// Brand: hovering "expands" the ~ into /home, the way a shell would.
// Frames type /home out character by character (and back again on leave).
const BRAND_FRAMES = ['~', '/', '/h', '/ho', '/hom', '/home'] as const
const brandFrame = ref(0)
const brandTyping = ref(false)
const brandText = computed(() => `${BRAND_FRAMES[brandFrame.value]}/laurens`)
const brandExpanded = computed(() => brandFrame.value === BRAND_FRAMES.length - 1)

let brandTimer: ReturnType<typeof setInterval> | undefined

const expandBrand = (expand: boolean) => {
  if (brandTimer) clearInterval(brandTimer)
  const target = expand ? BRAND_FRAMES.length - 1 : 0
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    brandFrame.value = target
    return
  }
  if (brandFrame.value === target) return
  brandTyping.value = true
  brandTimer = setInterval(() => {
    brandFrame.value += brandFrame.value < target ? 1 : -1
    if (brandFrame.value === target) {
      clearInterval(brandTimer)
      brandTyping.value = false
    }
  }, 55)
}

onUnmounted(() => {
  if (brandTimer) clearInterval(brandTimer)
})

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
  background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-l),
    0.72
  );
  backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
  transition: border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease;

  // hairline + subtle shadow appear once scrolled off the top
  &.is-scrolled {
    border-bottom-color: var(--bulma-border-weak);
    box-shadow: 0 4px 20px hsla(var(--lv-scheme-hs), 4%, 0.28);
    background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-l), 0.85);
  }
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
  display: inline-flex;
  align-items: center;
  color: var(--bulma-text-weak);
  white-space: pre;

  .brand-path {
    transition: color 0.2s ease;
  }

  // always-on block caret: the brand is a prompt waiting for input
  .brand-caret {
    width: 0.55em;
    height: 1.05em;
    margin-left: 0.18em;
    background-color: var(--bulma-primary);
    opacity: 0.75;
    animation: brand-caret-blink 1.15s steps(2, start) infinite;
  }

  // oh-my-zsh style branch segment, revealed once ~ has expanded to /home
  .brand-git {
    max-width: 0;
    overflow: hidden;
    margin-left: 0;
    color: var(--bulma-text-weak);
    opacity: 0;
    transition: max-width 0.3s ease, opacity 0.3s ease, margin-left 0.3s ease;
  }

  &:hover .brand-path {
    color: var(--bulma-primary-on-scheme);
  }

  // while typing, the caret is solid instead of blinking (like a busy shell)
  &.is-typing .brand-caret {
    animation: none;
    opacity: 1;
  }

  &.is-expanded .brand-git {
    max-width: 8em;
    margin-left: 0.6em;
    opacity: 0.75;
  }
}

@keyframes brand-caret-blink {
  to {
    visibility: hidden;
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

  .nav-brand .brand-caret {
    animation: none;
  }
}

// desktop search affordance
.nav-search {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  background: none;
  color: var(--bulma-text-weak);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;

  .nav-search-kbd {
    font-size: 0.72rem;
    opacity: 0.7;
  }

  &:hover {
    color: var(--bulma-primary-on-scheme);
    border-color: hsla(var(--lv-primary-hsl), 0.5);
  }
}

// full-screen mobile menu
.mobile-menu {
  position: fixed;
  inset: 3.25rem 0 0;
  z-index: 29;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1.5rem 2rem;
  background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-l), 0.98);
  backdrop-filter: blur(16px);
  overflow-y: auto;
}

.mobile-search {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.8rem 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: var(--bulma-radius);
  background-color: var(--bulma-scheme-main-bis);
  color: var(--bulma-text-weak);
  font: inherit;
  font-size: 0.95rem;
  cursor: pointer;

  .mobile-search-kbd {
    margin-left: auto;
    font-size: 0.75rem;
    opacity: 0.6;
  }
}

.mobile-link {
  display: flex;
  align-items: baseline;
  gap: 0.9rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--bulma-border-weak);
  color: var(--bulma-text-strong);
  font-size: 1.5rem;
  animation: mobile-link-in 0.3s ease backwards;
  animation-delay: calc(var(--i) * 0.04s + 0.05s);

  .mobile-link-index {
    color: var(--bulma-primary-on-scheme);
    font-size: 0.85rem;
  }

  &.is-active {
    color: var(--bulma-primary-on-scheme);
  }
}

@keyframes mobile-link-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
}

.mobile-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-top: auto;
  padding-top: 2rem;

  .mobile-action {
    border: none;
    background: none;
    padding: 0;
    color: var(--bulma-text-weak);
    font: inherit;
    font-size: 0.95rem;
    cursor: pointer;

    &:hover {
      color: var(--bulma-primary-on-scheme);
    }
  }
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.2s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .mobile-link {
    animation: none;
  }
}
</style>
