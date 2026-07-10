import type { Ref } from 'vue'
import { searchHistory, pickMatch, matchPosition } from '~/utils/terminal/reverseSearch'

// The stateful bits of TerminalConsole, pulled out so the component is mostly
// markup: ctrl+r reverse search, zsh-style completion cycling, and the
// braille spinner animation.

/** Reverse history search (ctrl+r): query, cursor, and accept/cancel flow. */
export function useReverseSearch(history: Ref<string[]>, input: Ref<string>, onDone: () => void) {
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
    onDone()
  }

  /** Leave search mode with the match in the input; optionally submit it. */
  const acceptSearch = (): string | null => {
    const match = searchMatch.value
    searchMode.value = false
    if (match) input.value = match
    onDone()
    return match
  }

  /** Search-mode keystrokes; returns true when the key was consumed. */
  const onSearchKey = (event: KeyboardEvent, submit: () => void): boolean => {
    if (!searchMode.value) return false
    if (event.key === 'Escape') cancelSearch()
    else if (event.key === 'Enter') {
      if (acceptSearch()) submit()
    } else if (event.key === 'Tab') acceptSearch()
    else if (event.key === 'r' && event.ctrlKey) searchCursor.value++
    else if (event.key === 'Backspace') searchQuery.value = searchQuery.value.slice(0, -1)
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      searchQuery.value += event.key
      searchCursor.value = 0
    } else {
      return true
    }
    event.preventDefault()
    return true
  }

  return { searchMode, searchQuery, searchMatch, searchCount, searchPosition, startSearch, cancelSearch, onSearchKey }
}

/**
 * Tab completion with zsh-style cycling: the first Tab applies the first
 * match, further Tabs (while the field still holds our suggestion) rotate
 * through the rest. Any real keystroke resets the cycle.
 */
export function useCompletionCycle(input: Ref<string>, complete: (value: string) => string[]) {
  let cycle: { list: string[], index: number } | null = null

  const autocomplete = () => {
    if (cycle && cycle.list.length > 1 && input.value === cycle.list[cycle.index]) {
      cycle.index = (cycle.index + 1) % cycle.list.length
      input.value = cycle.list[cycle.index]!
      return
    }
    const list = complete(input.value)
    if (!list.length) {
      cycle = null
      return
    }
    input.value = list[0]!
    cycle = list.length > 1 ? { list, index: 0 } : null
  }

  const resetCompletion = () => {
    cycle = null
  }

  return { autocomplete, resetCompletion }
}

const SPIN_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/** Animate the braille spinner while a label is set (a still glyph under
 * reduced motion). The interval only runs while the spinner is visible. */
export function useSpinnerFrames(spinnerLabel: Ref<string>) {
  const spinnerFrame = ref(SPIN_FRAMES[0])
  let timer: ReturnType<typeof setInterval> | undefined
  watch(spinnerLabel, (label) => {
    clearInterval(timer)
    if (!label || !import.meta.client) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      spinnerFrame.value = '⠿'
      return
    }
    let i = 0
    timer = setInterval(() => {
      i = (i + 1) % SPIN_FRAMES.length
      spinnerFrame.value = SPIN_FRAMES[i]!
    }, 80)
  })
  onUnmounted(() => clearInterval(timer))
  return { spinnerFrame }
}
