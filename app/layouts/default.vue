<template>
  <div class="site-shell">
    <ParticleNetwork />
    <div class="site-content">
      <AppNavbar />
      <main>
        <slot />
      </main>
      <AppFooter />
    </div>
    <TerminalOverlay />
    <CommandPalette />
    <BootSplash />
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

  main {
    flex: 1;
  }
}
</style>
