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
    <WebDesktop />
    <PartyMode />
    <LiveCursors />
  </div>
</template>

<style scoped lang="scss">
.site-shell {
  min-height: 100vh;
  background-color: var(--bulma-scheme-main);
  // Soft brand glow behind the top of every page
  background-image: radial-gradient(
    50rem 30rem at 70% -10%,
    hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.07),
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
