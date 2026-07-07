<template>
  <Teleport to="body">
    <Transition name="terminal">
      <div
        v-if="isOpen"
        class="terminal-backdrop"
        role="dialog"
        aria-label="Interactive terminal"
        @click.self="close"
      >
        <div class="terminal-window is-family-code" @click="focusInput">
          <header class="terminal-titlebar">
            <span class="dot dot-close" role="button" title="Close" @click="close" />
            <span class="dot dot-min" />
            <span class="dot dot-max" />
            <span class="terminal-title">visitor@{{ profile.domain }}: ~</span>
            <button class="terminal-close" aria-label="Close terminal" @click="close">
              <AppIcon name="close" :size="16" />
            </button>
          </header>

          <div ref="outputRef" class="terminal-output">
            <template v-for="line in lines" :key="line.id">
              <div v-if="line.type === 'input'" class="terminal-line">
                <span class="term-prompt">{{ prompt }}</span> {{ line.text }}
              </div>
              <pre v-else-if="line.html" class="terminal-line" :class="`is-${line.type}`" v-html="line.text" />
              <pre v-else class="terminal-line" :class="`is-${line.type}`">{{ line.text }}</pre>
            </template>
            <pre v-if="activeGame" class="terminal-line game-frame">{{ gameFrame }}</pre>
          </div>

          <div v-if="!activeGame" class="terminal-input-row">
            <label class="term-prompt" for="terminal-input">{{ prompt }}</label>
            <input
              id="terminal-input"
              ref="inputRef"
              v-model="input"
              class="terminal-input is-family-code"
              type="text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              @keydown.enter="submit"
              @keydown.up.prevent="historyUp"
              @keydown.down.prevent="historyDown"
              @keydown.tab.prevent="autocomplete"
              @keydown.ctrl.l.prevent="clearScreen"
              @keydown.esc="close"
            >
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onKeyStroke, useEventListener } from '@vueuse/core'
import { profile } from '~/data/profile'

const { isOpen, lines, history, run, complete, toggle, close, activeGame, gameFrame } = useTerminal()

const prompt = 'visitor@lv:~$'
const input = ref('')
const inputRef = ref<HTMLInputElement>()
const outputRef = ref<HTMLElement>()
const historyIndex = ref(-1)

const focusInput = () => inputRef.value?.focus()

const submit = () => {
  run(input.value)
  input.value = ''
  historyIndex.value = -1
}

const historyUp = () => {
  if (!history.value.length) return
  historyIndex.value =
    historyIndex.value === -1
      ? history.value.length - 1
      : Math.max(0, historyIndex.value - 1)
  input.value = history.value[historyIndex.value] ?? ''
}

const historyDown = () => {
  if (historyIndex.value === -1) return
  historyIndex.value++
  if (historyIndex.value >= history.value.length) {
    historyIndex.value = -1
    input.value = ''
  } else {
    input.value = history.value[historyIndex.value] ?? ''
  }
}

const autocomplete = () => {
  const match = complete(input.value)
  if (match) input.value = match
}

const clearScreen = () => {
  lines.value = []
}

// Open with ~ or ` when not typing in another field (and not mid-game)
onKeyStroke(['`', '~'], (event) => {
  if (activeGame.value) return
  const target = event.target as HTMLElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  event.preventDefault()
  toggle()
})

// While a game is running, all keys go to the game
useEventListener('keydown', (event: KeyboardEvent) => {
  if (!isOpen.value) return
  if (activeGame.value) {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (activeGame.value.onKey(event.key)) event.preventDefault()
  } else if (event.key === 'Escape') {
    // close from anywhere, even when the input isn't focused
    event.preventDefault()
    close()
  }
})

// hand focus back to the input when a game ends
watch(activeGame, async (game) => {
  if (!game && isOpen.value) {
    await nextTick()
    focusInput()
  }
})

watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    focusInput()
  }
})

// Keep scrolled to the latest output (and the game frame while playing)
watch([() => lines.value.length, () => gameFrame.value !== ''], async () => {
  await nextTick()
  outputRef.value?.scrollTo({ top: outputRef.value.scrollHeight })
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

.terminal-output {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.55;
}

.terminal-line {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  color: hsl(var(--lv-scheme-hs), 88%);

  &.is-error {
    color: var(--bulma-danger);
  }
  &.is-muted {
    color: hsl(var(--lv-scheme-hs), 55%);
  }
  &.is-primary {
    color: var(--bulma-primary);
  }

  :deep(a) {
    color: var(--bulma-primary);
    text-decoration: underline;
  }
  :deep(.term-accent) {
    color: var(--bulma-primary);
  }
}

.game-frame {
  margin-top: 0.5rem;
  color: var(--bulma-primary);
  line-height: 1.35;
}

.term-prompt {
  color: var(--bulma-primary);
  font-weight: 600;
  white-space: nowrap;
}

.terminal-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);
}

.terminal-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 0.9rem;
  color: hsl(var(--lv-scheme-hs), 92%);
  caret-color: var(--bulma-primary);
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
