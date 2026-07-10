// The status bar's playful state: presence dot, LF⇄CRLF, the language mode,
// the fake cursor position, the minute clock and the destroy-mode click armer.
// AppStatusBar keeps only markup; the pure helpers here are unit-tested.

export const PRESENCE = [
  { label: 'online', color: 'var(--bulma-success)' },
  { label: 'away', color: 'var(--bulma-warning)' },
  { label: 'busy', color: 'var(--bulma-danger)' },
  { label: 'invisible', color: 'var(--bulma-text-weak)' }
] as const

export const LANGS = ['Vue', 'TypeScript', 'SCSS', 'Markdown', 'Rust', 'JSON'] as const

/** The fake "cursor position" derived from the route — purely for vibes. */
export function vibeCursor(path: string): { line: number, column: number } {
  return {
    line: (path.length * 7) % 120 + 1,
    column: (path.length * 3) % 40 + 1
  }
}

/**
 * Count rapid clicks: `onArm` fires once `threshold` clicks land with never
 * more than `windowMs` between two of them (the version-number destroy egg).
 */
export function createClickArmer(threshold: number, windowMs: number, onArm: () => void) {
  let clicks = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const click = () => {
    clicks++
    clearTimeout(timer)
    timer = setTimeout(() => (clicks = 0), windowMs)
    if (clicks >= threshold) {
      clicks = 0
      onArm()
    }
  }
  const dispose = () => clearTimeout(timer)
  return { click, dispose }
}

export function useStatusBarEggs() {
  const route = useRoute()

  // presence, the Slack/Discord way — click the dot to cycle status
  const presenceIndex = ref(0)
  const presence = computed(() => PRESENCE[presenceIndex.value]!)
  const pinging = ref(false)
  let pingTimer: ReturnType<typeof setTimeout> | undefined
  const cyclePresence = () => {
    presenceIndex.value = (presenceIndex.value + 1) % PRESENCE.length
    // a quick radar ping on every change
    pinging.value = false
    requestAnimationFrame(() => (pinging.value = true))
    clearTimeout(pingTimer)
    pingTimer = setTimeout(() => (pinging.value = false), 600)
  }

  // classic editor toggle: LF ⇄ CRLF
  const eol = ref('LF')
  const toggleEol = () => (eol.value = eol.value === 'LF' ? 'CRLF' : 'LF')

  // the language-mode indicator, cycled like clicking it in a real editor
  const lang = ref(0)
  const cycleLang = () => (lang.value = (lang.value + 1) % LANGS.length)

  // fake cursor position that "moves" as you browse
  const line = ref(1)
  const column = ref(1)
  watch(
    () => route.path,
    (path) => {
      const cursor = vibeCursor(path)
      line.value = cursor.line
      column.value = cursor.column
    },
    { immediate: true }
  )

  // a live hh:mm clock, re-aligned to the next minute boundary after each tick
  const clock = ref('')
  let clockTimer: ReturnType<typeof setTimeout> | undefined
  const tickClock = () => {
    const now = new Date()
    clock.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    clockTimer = setTimeout(tickClock, 60_500 - (now.getSeconds() * 1000 + now.getMilliseconds()))
  }

  // easter egg: hammering the version number five times arms destroy mode
  const { destructActive } = useSiteEffects()
  const armer = createClickArmer(5, 1500, () => (destructActive.value = true))

  onMounted(tickClock)
  onUnmounted(() => {
    clearTimeout(clockTimer)
    clearTimeout(pingTimer)
    armer.dispose()
  })

  return {
    presence,
    pinging,
    cyclePresence,
    eol,
    toggleEol,
    lang,
    cycleLang,
    line,
    column,
    clock,
    versionClick: armer.click
  }
}
