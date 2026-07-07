<template>
  <div class="site-shell">
    <FlowField />
    <div class="site-content">
      <AppNavbar />
      <main>
        <slot />
      </main>
      <AppFooter />
    </div>
    <AppStatusBar />
    <TerminalOverlay />
    <CommandPalette />
    <BootSplash />
    <MatrixRain />
    <SlTrain />
    <!-- lvOS (incl. its window manager + apps) only loads once someone boots it -->
    <LazyWebDesktop v-if="desktopEverBooted" />
    <PartyMode />
    <LiveCursors />
  </div>
</template>

<script setup lang="ts">
// Keep the desktop out of the initial bundle: mount it the first time the user
// runs `desktop`, then leave it mounted so window state + boot logic persist.
const { desktopActive } = useSiteEffects()
const desktopEverBooted = ref(false)
watch(desktopActive, (active) => {
  if (active) desktopEverBooted.value = true
}, { immediate: true })
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
