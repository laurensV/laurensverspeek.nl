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
        <span class="brand-mark" aria-hidden="true" title="…try me thrice" @click="onMarkClick"><AppIcon name="prompt" :size="19" /></span><span class="brand-path">{{ brandText }}</span><span class="brand-caret" aria-hidden="true" /><span class="brand-git">git:(main)</span>
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

    <!-- reading-progress rail along the navbar's bottom edge -->
    <div class="scroll-rail" aria-hidden="true">
      <div class="scroll-rail-fill" :style="{ transform: `scaleX(${progress})` }" />
    </div>

    <!-- full-screen mobile menu (teleported so the navbar's backdrop-filter
         doesn't become its containing block and collapse it) -->
    <Teleport to="body">
      <Transition name="mobile-menu">
        <div
          v-if="mobileMenu"
          ref="menuEl"
          class="mobile-menu is-hidden-desktop"
          role="dialog"
          aria-modal="true"
          aria-label="site menu"
          @keydown="onMenuKeydown"
        >
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
    </Teleport>
  </nav>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'

const mobileMenu = ref(false)
// lightweight openers so the navbar doesn't pull the terminal/palette command
// registries into every page's bundle (the overlays are lazily mounted)
const palette = usePaletteLauncher()
const terminal = useTerminalLauncher()

// scroll-aware divider + the reading-progress rail along the bottom edge
const { scrolled, progress } = useScrollProgress()

const openPalette = () => {
  mobileMenu.value = false
  palette.open()
}
const openTerminal = () => {
  mobileMenu.value = false
  terminal.open()
}

// the mobile menu behaves as a modal dialog: scroll lock, focus trap, Escape
const menuEl = ref<HTMLElement | null>(null)
const { onKeydown: onMenuKeydown } = useModalMenu(mobileMenu, menuEl)

// Brand: hovering "expands" the ~ into /home, the way a shell would.
const { brandText, brandTyping, brandExpanded, expandBrand } = useBrandTyping()

const navItems = [
  { to: '/', label: 'home' },
  { to: '/projects', label: 'projects' },
  { to: '/blog', label: 'blog' },
  { to: '/about', label: 'about' },
  { to: '/contact', label: 'contact' }
]

// hover effect: nav labels "decode" out of glyph noise
const { scramble } = useTextScramble()

// hidden: triple-clicking the >_ prompt glyph toggles retro CRT mode (and
// swallows those clicks so the brand link doesn't navigate)
const { toggleCrt } = useSiteEffects()
const crtArmer = createClickArmer(3, 600, toggleCrt)
const onMarkClick = (event: MouseEvent) => {
  // the glyph never navigates (the brand text still links home) so the clicks
  // can accumulate; the third in quick succession flips CRT mode
  event.preventDefault()
  event.stopPropagation()
  crtArmer.click()
}
onUnmounted(crtArmer.dispose)
</script>

<style scoped lang="scss">
.app-navbar {
  position: sticky;
  top: 0;
  z-index: 30;
  background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-l),
    0.85
  );
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--bulma-border-weak);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease;

  // subtle shadow appear once scrolled off the top
  // &.is-scrolled {
  //   box-shadow: 0 4px 20px hsla(var(--lv-scheme-hs), 4%, 0.28);
  // }
}

// reading-progress rail hugging the navbar's bottom edge
.scroll-rail {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  pointer-events: none;
}

.scroll-rail-fill {
  height: 100%;
  transform-origin: left center;
  transform: scaleX(0);
  background: linear-gradient(
    90deg,
    hsla(var(--lv-primary-hsl), 0.5),
    var(--bulma-primary)
  );
  // no transition: it tracks the scroll position 1:1 (jank-free, motion-safe)
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
  // the brand leads the bar, so give it a touch more presence than the links
  font-size: 1rem;
  color: var(--bulma-text-weak);
  white-space: pre;

  // the >_ mark: a small amber prompt glyph that leads the brand
  .brand-mark {
    display: inline-flex;
    align-items: center;
    margin-right: 0.5em;
    color: var(--bulma-primary);
    transition: transform 0.2s ease;
  }

  &:hover .brand-mark {
    transform: translateX(1px);
  }

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
  // keep touch scroll inside the menu instead of chaining to the page behind
  overscroll-behavior: contain;
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
