<template>
  <div class="site-shell">
    <a href="#main-content" class="skip-link">skip to content</a>
    <RouteProgress />
    <FlowField />
    <div class="site-content">
      <AppNavbar />
      <main id="main-content" tabindex="-1">
        <PathBreadcrumbs />
        <slot />
      </main>
      <AppFooter />
    </div>
    <AppStatusBar />
    <MobileNav />
    <!-- the terminal + palette (and the ~45KB command registry they pull in) stay
         out of the initial bundle until first opened; the keydown shims below flip
         the shared flags so `~`/⌘K still work -->
    <LazyTerminalOverlay v-if="terminalOpen" />
    <LazyCommandPalette v-if="paletteOpen" />
    <ShortcutsHelp />
    <BootSplash />
    <WhatsNew />
    <NetworkToast />
    <PwaInstall />
    <!-- terminal-only easter eggs: loaded only once triggered -->
    <LazyMatrixRain v-if="matrixActive" />
    <LazyDomDestroyer v-if="destructActive" />
    <LazyFireworksShow v-if="fireworksActive" />
    <LazyScoreCelebration v-if="celebrateActive" />
    <SlTrain />
    <PartyMode />
    <BossScreen />
    <LiveCursors />
  </div>
</template>

<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'

// lvOS now lives on its own /desktop route (see pages/desktop.vue), so the shell
// no longer mounts it here.

// The terminal and command palette are lazily mounted (heavy command registry).
// This tiny always-on opener is the SOLE `~`/⌘K handler so nothing races the
// async mount: `~` outside a text field opens the terminal (typing `~` inside it
// stays literal), ⌘K opens the palette. Closing is Escape / `exit` / clicking
// away — the same way it always worked, since focus-in-input made `~` open-only.
const { isOpen: terminalOpen } = useTerminalLauncher()
const { isOpen: paletteOpen } = usePaletteLauncher()

onKeyStroke(['`', '~'], (event) => {
  const target = event.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  event.preventDefault()
  terminalOpen.value = true
})
onKeyStroke('k', (event) => {
  if (!(event.ctrlKey || event.metaKey)) return
  event.preventDefault()
  paletteOpen.value = true
})

// warm the lazy overlay chunks during idle: they're kept off the initial/preload
// path (the whole point), but prefetching once the page is quiet means the first
// `~`/⌘K opens instantly instead of waiting on a cold chunk fetch
onMounted(() => {
  if (!import.meta.client) return
  const warm = () => {
    void import('~/components/TerminalOverlay.vue')
    void import('~/components/CommandPalette.vue')
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 3000 })
  else setTimeout(warm, 1500)
})

// MatrixRain is a fairly heavy canvas component but only ever triggered from the
// terminal, so gate it behind its flag to keep it out of the initial bundle.
const { matrixActive, destructActive, fireworksActive, celebrateActive } = useSiteEffects()

// j/k · gg/G scrolling everywhere except lvOS, which has its own keyboard world
useVimScroll()

// deep links flash their target section on arrival
useAnchorHighlight()
</script>

<style scoped lang="scss">
.site-shell {
  min-height: 100vh; // fallback
  min-height: 100dvh; // mobile URL bars retract without a layout jump
  background-color: var(--bulma-scheme-main);
  // Soft brand glow behind the top of every page
  background-image: radial-gradient(
    50rem 30rem at 70% -10%,
    hsla(var(--lv-primary-hsl), 0.07),
    transparent
  );
}

.site-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh; // fallback
  min-height: 100dvh;
  // keep content clear of the fixed status bar
  padding-bottom: 1.65rem;

  // …and of the mobile tab bar riding above it on phones
  @media (max-width: 768px) {
    padding-bottom: calc(1.65rem + 3.4rem);
  }

  main {
    flex: 1;
  }
}
</style>
