<template>
  <Teleport to="body">
    <Transition name="terminal">
      <div
        v-if="isOpen"
        class="terminal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Interactive terminal"
        @click.self="close"
      >
        <div class="terminal-window is-family-code">
          <header class="terminal-titlebar">
            <span class="dot dot-close" role="button" title="Close" @click="close" />
            <span class="dot dot-min" />
            <span class="dot dot-max" />
            <span class="terminal-title">visitor@{{ profile.domain }}: ~</span>
            <button class="terminal-close" aria-label="Close terminal" @click="close">
              <AppIcon name="close" :size="16" />
            </button>
          </header>

          <TerminalConsole :active="isOpen" @escape="close" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { profile } from '~/data/profile'

const { isOpen, toggle, close, activeGame } = useTerminal()
const { desktopActive } = useSiteEffects()

// Open with ~ or ` when not typing in another field (and not mid-game).
// Inside the desktop the terminal is its own window, so let lvOS handle it.
onKeyStroke(['`', '~'], (event) => {
  if (activeGame.value || desktopActive.value) return
  const target = event.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  event.preventDefault()
  toggle()
})
</script>

<style scoped lang="scss">
.terminal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: hsla(var(--lv-scheme-hs), 4%, 0.6);
  backdrop-filter: blur(6px);
}

.terminal-window {
  display: flex;
  flex-direction: column;
  width: min(56rem, 100%);
  height: min(34rem, 85vh);
  border: 1px solid hsla(var(--lv-primary-hsl), 0.35);
  border-radius: var(--bulma-radius-large);
  background-color: hsla(var(--lv-scheme-hs), 6%, 0.96);
  box-shadow:
    0 0 60px hsla(var(--lv-primary-hsl), 0.12),
    0 24px 48px hsla(var(--lv-scheme-hs), 2%, 0.6);
  overflow: hidden;
}

.terminal-titlebar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);

  .dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
  }
  .dot-close {
    background-color: var(--bulma-danger);
    cursor: pointer;
  }
  .dot-min {
    background-color: var(--bulma-warning);
  }
  .dot-max {
    background-color: var(--bulma-success);
  }

  .terminal-title {
    flex: 1;
    text-align: center;
    font-size: 0.8rem;
    color: hsl(var(--lv-scheme-hs), 60%);
  }

  .terminal-close {
    display: flex;
    border: none;
    background: none;
    color: hsl(var(--lv-scheme-hs), 60%);
    cursor: pointer;

    &:hover {
      color: hsl(var(--lv-scheme-hs), 90%);
    }
  }
}

.terminal-enter-active,
.terminal-leave-active {
  transition: opacity 0.2s ease;

  .terminal-window {
    transition: transform 0.2s ease;
  }
}

.terminal-enter-from,
.terminal-leave-to {
  opacity: 0;

  .terminal-window {
    transform: translateY(1rem) scale(0.98);
  }
}
</style>
