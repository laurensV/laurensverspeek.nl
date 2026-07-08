<template>
  <div class="status-bar is-family-code no-print" role="contentinfo">
    <div class="status-group">
      <a
        class="status-item"
        href="https://github.com/laurensV/laurensverspeek.nl"
        target="_blank"
        rel="noopener"
        title="View source on GitHub"
      >
        <AppIcon name="code" :size="11" /> main*
      </a>
      <span class="status-item is-hidden-mobile">v2.0.0</span>
      <span class="status-item status-online">
        <span class="online-dot" /> online
      </span>
    </div>

    <div class="status-group">
      <span class="status-item is-hidden-touch">Ln {{ line }}, Col {{ column }}</span>
      <span class="status-item is-hidden-touch">UTF-8</span>
      <span class="status-item is-hidden-touch">LF</span>
      <span class="status-item is-hidden-mobile">Vue</span>
      <button class="status-item status-button is-hidden-mobile" title="Command palette" @click="palette.open()">
        ctrl+k
      </button>
      <button class="status-item status-button" title="Open terminal (~)" @click="terminal.open()">
        <AppIcon name="terminal" :size="11" /> zsh
      </button>
      <button class="status-item status-button" title="Toggle theme" @click="toggleTheme">
        <ClientOnly>
          <AppIcon :name="colorMode.value === 'dark' ? 'sun' : 'moon'" :size="11" />
          <template #fallback><AppIcon name="moon" :size="11" /></template>
        </ClientOnly>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const terminal = useTerminal()
const palette = useCommandPalette()
const colorMode = useColorMode()
const route = useRoute()

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// A cursor position that "moves" as you browse — purely for vibes
const line = ref(1)
const column = ref(1)
watch(
  () => route.path,
  (path) => {
    line.value = (path.length * 7) % 120 + 1
    column.value = (path.length * 3) % 40 + 1
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 1.65rem;
  padding: 0 0.5rem;
  font-size: 0.72rem;
  background-color: hsla(var(--lv-scheme-hs), var(--bulma-scheme-main-bis-l),
    0.92
  );
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--bulma-border-weak);
  color: var(--bulma-text-weak);
}

.status-group {
  display: flex;
  align-items: center;
  height: 100%;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 100%;
  padding: 0 0.55rem;
  color: inherit;
  white-space: nowrap;
}

a.status-item:hover,
.status-button:hover {
  background-color: hsla(var(--lv-primary-hsl), 0.15);
  color: var(--bulma-text-strong);
}

.status-button {
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
}

.status-online {
  .online-dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background-color: var(--bulma-success);
    box-shadow: 0 0 6px var(--bulma-success);
  }
}
</style>
