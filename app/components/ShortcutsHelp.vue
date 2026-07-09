<template>
  <Teleport to="body">
    <Transition name="shortcuts">
      <div
        v-if="isOpen"
        class="shortcuts-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        @click.self="isOpen = false"
      >
        <div class="shortcuts-window is-family-code">
          <TuiFrame />
          <header class="shortcuts-head">
            <span class="shortcuts-title">$ man laurensverspeek</span>
            <button class="shortcuts-close" aria-label="Close" @click="isOpen = false">×</button>
          </header>

          <div class="shortcuts-body">
            <section v-for="group in GROUPS" :key="group.title" class="shortcuts-group">
              <p class="shortcuts-group-title">## {{ group.title }}</p>
              <div v-for="row in group.rows" :key="row.label" class="shortcuts-row">
                <span class="shortcuts-keys">
                  <kbd v-for="key in row.keys" :key="key">{{ key }}</kbd>
                </span>
                <span class="shortcuts-label">{{ row.label }}</span>
              </div>
            </section>
          </div>

          <footer class="shortcuts-foot">press <kbd>esc</kbd> to close · there are more secrets than this…</footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'

// Press ? anywhere to see every shortcut and trick. Mounted globally.
const isOpen = ref(false)

const GROUPS = [
  {
    title: 'global',
    rows: [
      { keys: ['~'], label: 'open the interactive terminal' },
      { keys: ['ctrl', 'k'], label: 'open the command palette' },
      { keys: ['?'], label: 'show this help' },
      { keys: ['esc'], label: 'close any overlay' },
      { keys: ['j', 'k'], label: 'scroll the page, vim style' },
      { keys: ['gg', 'G'], label: 'jump to top / bottom' },
      { keys: ['gh', 'gb', 'gp'], label: 'go to home / blog / projects' }
    ]
  },
  {
    title: 'terminal',
    rows: [
      { keys: ['↑', '↓'], label: 'walk through command history' },
      { keys: ['tab'], label: 'autocomplete commands & arguments' },
      { keys: ['ctrl', 'r'], label: 'reverse history search' },
      { keys: ['ctrl', 'l'], label: 'clear the screen' },
      { keys: ['|', 'grep'], label: 'pipe output through grep / head / tail / wc' }
    ]
  },
  {
    title: 'try typing',
    rows: [
      { keys: ['help'], label: 'list every command' },
      { keys: ['tree'], label: 'the whole site as a directory tree' },
      { keys: ['desktop'], label: 'boot the lvOS desktop environment' },
      { keys: ['snake'], label: 'also: tetris · 2048 · hangman · top' },
      { keys: ['secrets'], label: 'reveal the hidden commands' }
    ]
  },
  {
    title: 'secrets',
    rows: [
      { keys: ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'b', 'a'], label: 'you know what this does' },
      { keys: ['/', '?desktop'], label: 'a URL that boots straight into lvOS' }
    ]
  }
]

onKeyStroke('?', (event) => {
  const target = event.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  event.preventDefault()
  isOpen.value = !isOpen.value
})

onKeyStroke('Escape', () => {
  if (isOpen.value) isOpen.value = false
})
</script>

<style scoped lang="scss">
.shortcuts-backdrop {
  position: fixed;
  inset: 0;
  z-index: 108;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: hsla(var(--lv-scheme-hs), 4%, 0.6);
  backdrop-filter: blur(5px);
}

.shortcuts-window {
  position: relative;
  width: min(44rem, 100%);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.35);
  border-radius: 2px;
  background-color: var(--bulma-scheme-main-bis);
  overflow: hidden;
}

.shortcuts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--bulma-border-weak);

  .shortcuts-title {
    color: var(--bulma-primary-on-scheme);
    font-size: 0.85rem;
  }

  .shortcuts-close {
    border: none;
    background: none;
    color: var(--bulma-text-weak);
    font-size: 1.3rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      color: var(--bulma-primary-on-scheme);
    }
  }
}

.shortcuts-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1.25rem 2rem;
  padding: 1.25rem;
  overflow-y: auto;
}

.shortcuts-group-title {
  margin-bottom: 0.6rem;
  color: var(--bulma-primary-on-scheme);
  font-size: 0.8rem;
}

.shortcuts-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.28rem 0;
  font-size: 0.82rem;

  .shortcuts-keys {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    flex-shrink: 0;
    min-width: 6.5rem;
  }

  .shortcuts-label {
    color: var(--bulma-text-weak);
  }
}

kbd {
  font-size: 0.72rem;
}

.shortcuts-foot {
  padding: 0.7rem 1rem;
  border-top: 1px solid var(--bulma-border-weak);
  color: var(--bulma-text-weak);
  font-size: 0.72rem;

  kbd {
    font-size: 0.68rem;
  }
}

.shortcuts-enter-active,
.shortcuts-leave-active {
  transition: opacity 0.15s ease;

  .shortcuts-window {
    transition: transform 0.15s ease;
  }
}

.shortcuts-enter-from,
.shortcuts-leave-to {
  opacity: 0;

  .shortcuts-window {
    transform: scale(0.98);
  }
}
</style>
