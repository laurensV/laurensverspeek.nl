<template>
  <div class="terminal-panes" :class="layout">
    <div
      v-for="id in panes.ids.value"
      :key="id"
      class="terminal-pane"
      :class="{ 'is-focused': panes.ids.value.length > 1 && panes.active.value === id }"
      @click="panes.setActive(id)"
    >
      <TerminalConsole
        :active="active && panes.active.value === id"
        :pane-id="id"
        :input-id="id === 0 ? inputIdBase : `${inputIdBase}-${id}`"
        @escape="emit('escape')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { paneLayout, prefixAction } from '~/utils/terminal/panes'

// tmux-style pane grid around TerminalConsole. Ctrl+B is the prefix key:
// % / " split, arrows or o move focus, x closes. Both the overlay and the
// lvOS terminal window wrap their console(s) in this.
const props = withDefaults(
  defineProps<{ active?: boolean, inputIdBase?: string }>(),
  { active: true, inputIdBase: 'terminal-input' }
)
const emit = defineEmits<{ escape: [] }>()

const { panes, activeGame } = useTerminal()

const layout = computed(() => paneLayout(panes.ids.value.length, panes.dir.value))

// prefix state: Ctrl+B arms the next keystroke for a short window
let prefixUntil = 0

// capture phase: pane keys must win over the input's own key handlers
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (!props.active || activeGame.value) return
  if (event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'b') {
    event.preventDefault()
    event.stopPropagation()
    prefixUntil = Date.now() + 2000
    return
  }
  if (Date.now() >= prefixUntil) return
  prefixUntil = 0
  const action = prefixAction(event.key)
  if (!action) return
  event.preventDefault()
  event.stopPropagation()
  if (action.kind === 'split') {
    panes.split(action.dir)
  } else if (action.kind === 'focus') {
    panes.focusStep(action.step)
  } else if (panes.close(panes.active.value) === 'root' && panes.ids.value.length === 1) {
    // closing the last remaining pane closes the terminal, like tmux would
    emit('escape')
  }
}, { capture: true })
</script>

<style scoped lang="scss">
.terminal-panes {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template: 1fr / 1fr;

  &.is-cols {
    grid-template: 1fr / 1fr 1fr;
  }
  &.is-rows {
    grid-template: 1fr 1fr / 1fr;
  }
  &.is-grid {
    grid-template: 1fr 1fr / 1fr 1fr;
  }

  // a phone can't host side-by-side shells: a half-width pane clips the prompt
  // and piles the quick-key row into overlapping pills — stack every layout
  // vertically instead so each pane keeps the full width
  @media (max-width: 640px) {
    &.is-cols,
    &.is-rows,
    &.is-grid {
      grid-template: none / 1fr;
      grid-auto-flow: row;
      grid-auto-rows: 1fr;
    }
  }
}

.terminal-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  // clip, not hidden: focusing a pane's input made the browser scroll this
  // clipping box sideways to reveal the caret (scrollLeft stuck at ~32px,
  // chopping the prompt) — clip forbids programmatic scrolling entirely
  overflow: hidden;
  overflow: clip;

  // pane borders only matter once there's more than one
  &:not(:only-child) {
    border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);

    &.is-focused {
      border-color: hsla(var(--lv-primary-hsl), 0.45);
    }
  }
}
</style>
