<template>
  <div class="terminal-console is-family-code" :style="{ '--term-font-scale': fontScale.scale.value }" @click="focusInput">
    <div ref="outputRef" class="terminal-output">
      <template v-for="line in paneLines" :key="line.id">
        <div v-if="line.type === 'input'" class="terminal-line">
          <span class="term-prompt">{{ prompt }}</span> {{ line.text }}
        </div>
        <pre v-else-if="line.html" class="terminal-line" :class="`is-${line.type}`" v-html="line.text" />
        <pre v-else class="terminal-line" :class="`is-${line.type}`">{{ line.text }}</pre>
      </template>
      <pre v-if="activeGame && active" class="terminal-line game-frame">{{ gameFrame }}</pre>
      <pre v-if="spinnerLabel && !activeGame && active" class="terminal-line is-muted terminal-spinner">{{ spinnerFrame }} {{ spinnerLabel }}</pre>
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
        @input="resetCompletion"
        @keydown.enter="submit"
        @keydown.up.prevent="historyUp"
        @keydown.down.prevent="historyDown"
        @keydown.tab.prevent="autocomplete"
        @keydown.ctrl.l.prevent="clearScreen"
        @keydown.ctrl.r.prevent="startSearch"
        @keydown.esc="onEscape"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { searchHistory, pickMatch, matchPosition } from '~/utils/terminal/reverseSearch'

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

// braille spinner: animate while a command is fetching (a still glyph under
// reduced motion). The interval only runs while the spinner is visible.
const SPIN_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const spinnerFrame = ref(SPIN_FRAMES[0])
let spinTimer: ReturnType<typeof setInterval> | undefined
watch(spinnerLabel, (label) => {
  clearInterval(spinTimer)
  if (!label || !import.meta.client) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    spinnerFrame.value = '⠿'
    return
  }
  let i = 0
  spinTimer = setInterval(() => {
    i = (i + 1) % SPIN_FRAMES.length
    spinnerFrame.value = SPIN_FRAMES[i]!
  }, 80)
})
onUnmounted(() => clearInterval(spinTimer))
const fontScale = useTermFontScale()
const { name } = useIdentity()

// the host segment flips when the ssh easter egg "connects" somewhere
const sshHost = useState(STATE_KEYS.terminalSshHost, () => '')
const prompt = computed(() => `${name.value}@${sshHost.value || 'lv'}:${cwd.value}$`)
const input = ref('')
const inputRef = ref<HTMLInputElement>()
const outputRef = ref<HTMLElement>()
const historyIndex = ref(-1)

const focusInput = () => {
  if (props.active) inputRef.value?.focus()
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

// Tab completion with zsh-style cycling: the first Tab applies the first match,
// each further Tab (while the field still holds our suggestion) rotates through
// the rest. Any real keystroke resets the cycle (see resetCompletion).
let completionCycle: { list: string[], index: number } | null = null

const autocomplete = () => {
  if (
    completionCycle
    && completionCycle.list.length > 1
    && input.value === completionCycle.list[completionCycle.index]
  ) {
    completionCycle.index = (completionCycle.index + 1) % completionCycle.list.length
    input.value = completionCycle.list[completionCycle.index]!
    return
  }
  const list = complete(input.value)
  if (!list.length) {
    completionCycle = null
    return
  }
  input.value = list[0]!
  completionCycle = list.length > 1 ? { list, index: 0 } : null
}

const resetCompletion = () => {
  completionCycle = null
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

// ---- reverse history search (ctrl+r) ----
const searchMode = ref(false)
const searchQuery = ref('')
const searchCursor = ref(0)

const searchMatches = computed(() => searchHistory(history.value, searchQuery.value))
const searchMatch = computed(() => pickMatch(searchMatches.value, searchCursor.value))
// how many commands match, and which one (1-based) is currently shown
const searchCount = computed(() => searchMatches.value.length)
const searchPosition = computed(() => matchPosition(searchCount.value, searchCursor.value))

const startSearch = () => {
  searchMode.value = true
  searchQuery.value = ''
  searchCursor.value = 0
}

const cancelSearch = () => {
  searchMode.value = false
  searchQuery.value = ''
  void nextTick(focusInput)
}

const acceptSearch = (runIt: boolean) => {
  const match = searchMatch.value
  searchMode.value = false
  if (match) {
    input.value = match
    if (runIt) submit()
  }
  void nextTick(focusInput)
}

// keyboard for the active console: game keys, and search-mode typing
useEventListener('keydown', (event: KeyboardEvent) => {
  if (!props.active) return

  if (activeGame.value) {
    if (event.metaKey || event.altKey) return
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

  if (searchMode.value) {
    if (event.key === 'Escape') { event.preventDefault(); cancelSearch() }
    else if (event.key === 'Enter') { event.preventDefault(); acceptSearch(true) }
    else if (event.key === 'Tab') { event.preventDefault(); acceptSearch(false) }
    else if ((event.key === 'r' && event.ctrlKey)) { event.preventDefault(); searchCursor.value++ }
    else if (event.key === 'Backspace') { event.preventDefault(); searchQuery.value = searchQuery.value.slice(0, -1) }
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      searchQuery.value += event.key
      searchCursor.value = 0
    }
  }
})

// refocus the input when a game ends
watch(activeGame, async (game) => {
  if (!game && props.active) {
    await nextTick()
    focusInput()
  }
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
  color: var(--bulma-text-weak);
  font-size: 0.75rem;
  white-space: nowrap;
}

.terminal-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: calc(0.9rem * var(--term-font-scale, 1));
  color: hsl(var(--lv-scheme-hs), 92%);
  caret-color: var(--bulma-primary);
}
</style>
