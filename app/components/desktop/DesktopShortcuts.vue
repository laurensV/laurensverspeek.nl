<template>
  <div class="lvos-shortcuts is-family-code" role="dialog" aria-modal="true" aria-label="lvOS shortcuts" @click.self="emit('close')">
    <div class="lvos-shortcuts-panel">
      <header class="lvos-shortcuts-head">
        <span>lvOS — keyboard shortcuts</span>
        <button aria-label="Close" @click="emit('close')">×</button>
      </header>
      <div class="lvos-shortcuts-body">
        <div v-for="row in ROWS" :key="row.label" class="lvos-shortcuts-row">
          <span class="lvos-shortcuts-keys">
            <kbd v-for="key in row.keys" :key="key">{{ key }}</kbd>
          </span>
          <span class="lvos-shortcuts-label">{{ row.label }}</span>
        </div>
      </div>
      <footer class="lvos-shortcuts-foot">press <kbd>?</kbd> or <kbd>esc</kbd> to close</footer>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()

const ROWS = [
  { keys: ['~'], label: 'open a terminal window' },
  { keys: ['alt', 'tab'], label: 'switch between windows' },
  { keys: ['drag', 'edge'], label: 'snap a window to a half or corner' },
  { keys: ['dbl-click'], label: 'maximize / restore a window (title bar)' },
  { keys: ['right-click', 'title'], label: 'window menu: pin, minimize, close' },
  { keys: ['right-click', 'desktop'], label: 'new terminal · change wallpaper' },
  { keys: ['esc'], label: 'dismiss a menu, or log out' },
  { keys: ['?'], label: 'this cheat sheet' }
]
</script>

<style scoped lang="scss">
.lvos-shortcuts {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsla(var(--lv-scheme-hs), 3%, 0.55);
  backdrop-filter: blur(4px);
}

.lvos-shortcuts-panel {
  width: min(30rem, 88vw);
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
  font-size: 0.78rem;
}

.lvos-shortcuts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--bulma-border-weak);
  color: var(--bulma-primary);

  button {
    border: none;
    background: none;
    color: var(--bulma-text-weak);
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      color: var(--bulma-primary);
    }
  }
}

.lvos-shortcuts-body {
  padding: 0.75rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.lvos-shortcuts-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;

  .lvos-shortcuts-keys {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    flex-shrink: 0;
    min-width: 9rem;
  }

  .lvos-shortcuts-label {
    color: hsl(var(--lv-scheme-hs), 75%);
  }
}

.lvos-shortcuts-foot {
  padding: 0.55rem 0.9rem;
  border-top: 1px solid var(--bulma-border-weak);
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.7rem;
}

kbd {
  padding: 0.05em 0.4em;
  border: 1px solid var(--bulma-border);
  border-radius: var(--bulma-radius-small);
  background-color: var(--bulma-scheme-main-ter);
  font-family: inherit;
  font-size: 0.7rem;
}
</style>
