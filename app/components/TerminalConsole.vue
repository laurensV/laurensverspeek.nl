<template>
  <div class="terminal-console is-family-code" :style="{ '--term-font-scale': fontScale.scale.value }" @click="onConsoleClick">
    <!-- role=log lets screen readers announce command results; the game frame
         and spinner repaint every tick, so they stay out of the live region -->
    <div ref="outputRef" class="terminal-output" role="log" aria-live="polite" aria-label="Terminal output">
      <template v-for="line in paneLines" :key="line.id">
        <div v-if="line.type === 'input'" class="terminal-line">
          <span class="term-prompt">{{ prompt }}</span> {{ line.text }}
        </div>
        <pre v-else-if="line.html" class="terminal-line" :class="`is-${line.type}`" v-html="line.text" />
        <pre v-else class="terminal-line" :class="`is-${line.type}`">{{ line.text }}</pre>
      </template>
      <pre v-if="activeGame && active" class="terminal-line game-frame" aria-hidden="true">{{ gameFrame }}</pre>
      <!-- invisible field: raises the soft keyboard so letter-driven games are
           playable on touch; its characters route into the game via onGameText -->
      <input
        v-if="gameWantsText && active"
        ref="gameCaptureRef"
        class="terminal-game-capture"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        aria-label="Game text input"
        @input="onGameText"
      >
      <pre v-if="spinnerLabel && !activeGame && active" class="terminal-line is-muted terminal-spinner" aria-hidden="true">{{ spinnerFrame }} {{ spinnerLabel }}</pre>
    </div>

    <!-- reverse history search (ctrl+r) -->
    <div v-if="searchMode" class="terminal-input-row terminal-search">
      <span class="term-prompt">(reverse-i-search)`{{ searchQuery }}':</span>
      <span class="terminal-search-match">{{ searchMatch || '' }}</span>
      <span class="terminal-search-count">
        <template v-if="searchQuery && !searchCount">no matches</template>
        <template v-else-if="searchCount">[{{ searchPosition }}/{{ searchCount }}] ctrl+r next · ↵ run · tab edit</template>
      </span>
    </div>
    <div v-else-if="!activeGame" class="terminal-input-row">
      <label class="term-prompt" :for="inputId">{{ prompt }}</label>
      <input
        :id="inputId"
        ref="inputRef"
        v-model="input"
        class="terminal-input is-family-code"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        @input="onType"
        @keydown.enter="submit"
        @keydown.up.prevent="historyUp"
        @keydown.down.prevent="historyDown"
        @keydown.tab.prevent="autocomplete"
        @keydown.ctrl.l.prevent="clearScreen"
        @keydown.ctrl.r.prevent="startSearch"
        @keydown.esc="onEscape"
      >
    </div>

    <!-- touch quick keys (coarse pointers only, via CSS): Tab/history for the
         shell, and the arrow/quit keys games need but phone keyboards lack.
         pointerdown.prevent keeps focus in the input while tapping. -->
    <div v-if="active" class="terminal-quickkeys" aria-label="Terminal quick keys">
      <template v-if="activeGame">
        <button @pointerdown.prevent @click="gameKey('ArrowLeft')">←</button>
        <button @pointerdown.prevent @click="gameKey('ArrowUp')">↑</button>
        <button @pointerdown.prevent @click="gameKey('ArrowDown')">↓</button>
        <button @pointerdown.prevent @click="gameKey('ArrowRight')">→</button>
        <button @pointerdown.prevent @click="gameKey(' ')">space</button>
        <button @pointerdown.prevent @click="gameKey('Enter')">↵</button>
        <button @pointerdown.prevent @click="gameKey('q')">q</button>
      </template>
      <template v-else>
        <button @pointerdown.prevent @click="autocomplete">tab</button>
        <button @pointerdown.prevent @click="historyUp">↑ hist</button>
        <button @pointerdown.prevent @click="historyDown">↓</button>
        <button @pointerdown.prevent @click="typeChar('|')">|</button>
        <button @pointerdown.prevent @click="typeChar('~')">~</button>
        <!-- tmux split needs Ctrl+B on a keyboard; give touch its own control -->
        <button @pointerdown.prevent @click="splitPane">⊞ split</button>
        <button v-if="panes.ids.value.length > 1" @pointerdown.prevent @click="closePane">✕ pane</button>
        <button @pointerdown.prevent @click="onEscape">esc</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { useReverseSearch, useCompletionCycle, useSpinnerFrames } from '~/composables/useTerminalConsole'

// The interactive guts of the terminal: output, input, history, completion,
// ctrl+r search, and game key routing. Both the centered overlay and the lvOS
// desktop window wrap this — `active` gates which instance owns the keyboard.
const props = withDefaults(
  defineProps<{ active?: boolean, inputId?: string, paneId?: number }>(),
  { active: true, inputId: 'terminal-input', paneId: 0 }
)
const emit = defineEmits<{ escape: [] }>()

const { history, cwd, run, complete, activeGame, gameFrame, spinnerLabel, panes } = useTerminal()

// this console renders one pane's transcript (pane 0 unless told otherwise)
const paneLines = computed(() => panes.linesFor(props.paneId))

// braille spinner while a command is fetching (see useTerminalConsole)
const { spinnerFrame } = useSpinnerFrames(spinnerLabel)
const fontScale = useTermFontScale()
const { name } = useIdentity()

// the host segment flips when the ssh easter egg "connects" somewhere
const sshHost = useState(STATE_KEYS.terminalSshHost, () => '')
const prompt = computed(() => `${name.value}@${sshHost.value || 'lv'}:${cwd.value}$`)
const input = ref('')
const inputRef = ref<HTMLInputElement>()
const outputRef = ref<HTMLElement>()
const historyIndex = ref(-1)

// a focused (but invisible) text field raises the soft keyboard for letter-
// driven games (adventure/hangman/wpm) on touch — mobile keyboards don't fire
// reliable keydowns for letters, so its characters route into onKey instead
const gameCaptureRef = ref<HTMLInputElement>()
const isCoarse = ref(false)
const gameWantsText = computed(() => isCoarse.value && !!activeGame.value?.acceptsText)

const focusInput = () => {
  if (!props.active) return
  if (gameWantsText.value) gameCaptureRef.value?.focus()
  else inputRef.value?.focus()
}

// clicking the console focuses the input — but not while the user is selecting
// transcript text to copy, since focusing collapses the selection
const onConsoleClick = () => {
  if (window.getSelection()?.toString()) return
  focusInput()
}

// forward each typed character into the game, then clear so the field never
// accumulates (the game frame is the only echo); Enter/Backspace still arrive
// through the keydown listener, which fires reliably on mobile for those
const onGameText = (event: Event) => {
  const el = event.target as HTMLInputElement
  for (const ch of el.value) activeGame.value?.onKey(ch)
  el.value = ''
}

const submit = () => {
  run(input.value)
  input.value = ''
  historyIndex.value = -1
}

const historyUp = () => {
  if (!history.value.length) return
  historyIndex.value =
    historyIndex.value === -1 ? history.value.length - 1 : Math.max(0, historyIndex.value - 1)
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

// zsh-style Tab completion cycling (see useTerminalConsole)
const { autocomplete, resetCompletion } = useCompletionCycle(input, complete)

// opt-in mechanical-keyboard typing sounds (terminal `keyclick`); a tick per
// character typed, then the usual completion reset
const keyClick = useKeyClick()
const onType = () => {
  keyClick.click()
  resetCompletion()
}

// the touch quick-key row routes into the same handlers the keyboard uses
const gameKey = (key: string) => {
  activeGame.value?.onKey(key)
}
const typeChar = (char: string) => {
  input.value += char
  focusInput()
}
// touch split/close for tmux panes (the keyboard uses ctrl+b % / x)
const splitPane = () => {
  panes.split('cols')
  focusInput()
}
const closePane = () => {
  const target = panes.active.value !== 0 ? panes.active.value : panes.ids.value.find((id) => id !== 0)
  if (target !== undefined) panes.close(target)
  focusInput()
}

const clearScreen = () => {
  panes.clear(props.paneId)
}

const onEscape = () => {
  if (searchMode.value) {
    cancelSearch()
    return
  }
  emit('escape')
}

// ---- reverse history search (ctrl+r, see useTerminalConsole) ----
const {
  searchMode, searchQuery, searchMatch, searchCount, searchPosition,
  startSearch, cancelSearch, onSearchKey
} = useReverseSearch(history, input, () => void nextTick(focusInput))

// keyboard for the active console: game keys, and search-mode typing
useEventListener('keydown', (event: KeyboardEvent) => {
  if (!props.active) return

  if (activeGame.value) {
    if (event.metaKey || event.altKey) return
    // on touch, a text game's printable characters come through the capture
    // field's input event instead (mobile keydowns are unreliable for letters),
    // so skip them here to avoid double-forwarding
    if (gameWantsText.value && event.key.length === 1 && !event.ctrlKey) return
    // ctrl combos reach games as 'ctrl+x' etc. (the editors use them);
    // unconsumed keys keep their browser default, as before
    const key = event.ctrlKey ? `ctrl+${event.key.toLowerCase()}` : event.key
    if (activeGame.value.onKey(key)) event.preventDefault()
    return
  }

  // ctrl+= / ctrl+- / ctrl+0 scale the terminal text
  if (event.ctrlKey && !event.metaKey && !event.altKey) {
    if (event.key === '=' || event.key === '+') {
      event.preventDefault()
      fontScale.bump(0.1)
      return
    }
    if (event.key === '-') {
      event.preventDefault()
      fontScale.bump(-0.1)
      return
    }
    if (event.key === '0') {
      event.preventDefault()
      fontScale.set(1)
      return
    }
  }

  onSearchKey(event, submit)
})

// refocus when a game ends — and, for a text game, focus the capture field so
// the soft keyboard opens right away on touch
watch(activeGame, async () => {
  if (!props.active) return
  await nextTick()
  focusInput()
})

watch(
  () => props.active,
  async (active) => {
    if (active) {
      await nextTick()
      focusInput()
    }
  },
  { immediate: true }
)

// keep scrolled to the latest output
watch([() => paneLines.value.length, () => gameFrame.value !== ''], async () => {
  await nextTick()
  outputRef.value?.scrollTo({ top: outputRef.value.scrollHeight })
})

// a console opening onto an existing transcript starts at the bottom too
onMounted(() => {
  isCoarse.value = window.matchMedia('(pointer: coarse)').matches
  outputRef.value?.scrollTo({ top: outputRef.value.scrollHeight })
})

defineExpose({ focusInput })
</script>

<style scoped lang="scss">
.terminal-console {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.terminal-output {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  font-size: calc(0.9rem * var(--term-font-scale, 1));
  line-height: 1.55;
}

.terminal-line {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font-size: inherit;
  white-space: pre-wrap;
  overflow-wrap: break-word;
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
  :deep(.term-green) {
    color: var(--bulma-success);
  }
  :deep(.term-red) {
    color: var(--bulma-danger);
  }
  // ascii QR (contact --qr): half blocks only scan when rows tile seamlessly
  :deep(.term-qr) {
    display: inline-block;
    margin: 0.4rem 0;
    padding: 0.6rem;
    background-color: #fff;
    color: #000;
    line-height: 1;
    letter-spacing: 0;
    border-radius: 2px;
  }
}

.game-frame {
  margin-top: 0.5rem;
  color: var(--bulma-primary);
  line-height: 1.35;
  // the grid games (snake is 51 columns wide) must never wrap — a wrapped row
  // corrupts the board. keep it rigid and let it scroll sideways if it's wider
  // than the pane instead of inheriting .terminal-line's pre-wrap
  white-space: pre;
  overflow-x: auto;

  // on a phone, shrink the board font so most of it fits without scrolling
  @media (pointer: coarse) {
    font-size: 0.72rem;
  }
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

.terminal-search-match {
  color: hsl(var(--lv-scheme-hs), 88%);
}

.terminal-search-count {
  margin-left: auto;
  padding-left: 1rem;
  // the terminal is an always-dark surface; --bulma-text-weak is dark-on-dark
  // in light theme, so dim the scheme colour instead (matches .search-match)
  color: hsl(var(--lv-scheme-hs), 62%);
  font-size: 0.75rem;
  white-space: nowrap;
}

.terminal-input {
  flex: 1;
  // let the flex input shrink below its intrinsic ~20-char width; without this
  // (default min-width:auto) the input-row overflows on a narrow phone and the
  // autofocus scrolls the whole pane ~50px left, clipping the prompt and welcome
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  font-size: calc(0.9rem * var(--term-font-scale, 1));
  color: hsl(var(--lv-scheme-hs), 92%);
  caret-color: var(--bulma-primary);

  // never below 16px on touch, or iOS zooms the page on focus (the scale can
  // still push it larger)
  @media (pointer: coarse) {
    font-size: max(16px, calc(0.9rem * var(--term-font-scale, 1)));
  }
}

// invisible keyboard-capture field for letter-driven games on touch: tapping
// the console focuses it (see the wrapper's @click) which raises the soft
// keyboard; 16px dodges iOS zoom, transparent text keeps the game frame the
// only visible echo
.terminal-game-capture {
  display: block;
  width: 100%;
  height: 2rem;
  margin-top: 0.25rem;
  padding: 0;
  border: none;
  background: none;
  color: transparent;
  font-size: 16px;
  caret-color: transparent;
  opacity: 0;
}

// the quick-key row only exists for fingers
.terminal-quickkeys {
  display: none;

  @media (pointer: coarse) {
    display: flex;
    gap: 0.4rem;
    padding: 0.45rem 0.75rem calc(0.45rem + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.12);
    overflow-x: auto;

    button {
      flex: 1;
      min-width: 2.6rem;
      padding: 0.5rem 0.6rem;
      border: 1px solid hsla(var(--lv-primary-hsl), 0.3);
      border-radius: var(--bulma-radius);
      background-color: hsla(var(--lv-primary-hsl), 0.08);
      color: hsl(var(--lv-scheme-hs), 85%);
      font: inherit;
      font-size: 0.8rem;

      &:active {
        background-color: hsla(var(--lv-primary-hsl), 0.25);
      }
    }

    // on the narrowest phones the 7–8 keys overflow and the last ('esc') falls
    // off-screen with no scroll cue — tighten so the whole row fits
    @media (max-width: 360px) {
      gap: 0.25rem;
      padding-inline: 0.5rem;

      button {
        min-width: 0;
        padding: 0.5rem 0.35rem;
        font-size: 0.72rem;
      }
    }
  }
}
</style>
