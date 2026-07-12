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
    <TerminalOverlay />
    <CommandPalette />
    <ShortcutsHelp />
    <BootSplash />
    <WhatsNew />
    <!-- terminal-only easter eggs: loaded only once triggered -->
    <LazyMatrixRain v-if="matrixActive" />
    <LazyDomDestroyer v-if="destructActive" />
    <LazyFireworksShow v-if="fireworksActive" />
    <SlTrain />
    <PartyMode />
    <BossScreen />
    <LiveCursors />
  </div>
</template>

<script setup lang="ts">
// lvOS now lives on its own /desktop route (see pages/desktop.vue), so the shell
// no longer mounts it here.

// MatrixRain is a fairly heavy canvas component but only ever triggered from the
// terminal, so gate it behind its flag to keep it out of the initial bundle.
const { matrixActive, destructActive, fireworksActive } = useSiteEffects()

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
