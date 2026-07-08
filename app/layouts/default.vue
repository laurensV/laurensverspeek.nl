<template>
  <div class="site-shell">
    <a href="#main-content" class="skip-link">skip to content</a>
    <FlowField />
    <div class="site-content">
      <AppNavbar />
      <main id="main-content" tabindex="-1">
        <slot />
      </main>
      <AppFooter />
    </div>
    <AppStatusBar />
    <TerminalOverlay />
    <CommandPalette />
    <ShortcutsHelp />
    <BootSplash />
    <MatrixRain />
    <SlTrain />
    <PartyMode />
    <LiveCursors />
  </div>
</template>

<script setup lang="ts">
// lvOS now lives on its own /desktop route (see pages/desktop.vue), so the shell
// no longer mounts it here.
</script>

<style scoped lang="scss">
.site-shell {
  min-height: 100vh;
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
  min-height: 100vh;
  // keep content clear of the fixed status bar
  padding-bottom: 1.65rem;

  main {
    flex: 1;
  }
}
</style>
