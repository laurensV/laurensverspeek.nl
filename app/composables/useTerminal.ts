import type { GameHandle, GameCallbacks } from '~/utils/terminalGames'
import type { TerminalLine, TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createContentCommands } from '~/utils/terminal/contentCommands'
import { createSystemCommands } from '~/utils/terminal/systemCommands'
import { createFunCommands } from '~/utils/terminal/funCommands'
import { profile } from '~/data/profile'

export type { TerminalLine } from '~/utils/terminal/types'

let lineId = 0

// Game state lives at module scope: only ever touched client-side,
// and shared by every useTerminal() caller.
const activeGame = shallowRef<GameHandle | null>(null)
const gameFrame = ref('')

const HISTORY_KEY = 'lv-terminal-history'
let historyRestored = false

const stripHtml = (text: string) => text.replace(/<[^>]+>/g, '')

/**
 * Shared terminal state + command interpreter.
 * State lives in useState so the navbar, footer and overlay all talk to the
 * same terminal instance. The commands themselves are defined in per-domain
 * modules under app/utils/terminal/.
 */
export function useTerminal() {
  const isOpen = useState('terminal-open', () => false)
  const lines = useState<TerminalLine[]>('terminal-lines', () => [])
  const history = useState<string[]>('terminal-history', () => [])

  const router = useRouter()
  const nuxtApp = useNuxtApp()
  const colorMode = useColorMode()
  const { matrixActive, desktopActive, toggleCrt } = useSiteEffects()

  // command history survives visits (last 100 entries)
  if (import.meta.client && !historyRestored) {
    historyRestored = true
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as unknown
      if (Array.isArray(saved)) {
        history.value = saved.filter((entry): entry is string => typeof entry === 'string')
      }
    } catch { /* corrupted storage — start fresh */ }
  }

  const saveHistory = () => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value.slice(-100)))
    } catch { /* storage full or blocked — history stays session-only */ }
  }

  // output sink indirection: pipes temporarily capture lines instead of printing
  let sink: ((line: TerminalLine) => void) | null = null

  const push = (type: TerminalLine['type'], text: string, html = false) => {
    const line: TerminalLine = { id: lineId++, type, text, html }
    if (sink) sink(line)
    else lines.value.push(line)
  }
  const out = (text: string) => push('output', text)
  const muted = (text: string) => push('muted', text)
  const error = (text: string) => push('error', text)
  const link = (label: string, url: string) =>
    push('output', `<a href="${url}" target="_blank" rel="noopener">${label}</a>`, true)

  const greet = () => {
    push('primary', `Welcome to ${profile.domain} v2.0.0`)
    muted(`Type 'help' to see available commands, 'exit' or Esc to close.`)
  }

  const open = () => {
    if (!lines.value.length) greet()
    isOpen.value = true
  }
  const close = () => {
    activeGame.value?.stop()
    activeGame.value = null
    isOpen.value = false
  }
  const toggle = () => (isOpen.value ? close() : open())

  const startGame = (create: (callbacks: GameCallbacks) => GameHandle) => {
    activeGame.value = create({
      onFrame: (frame) => (gameFrame.value = frame),
      onEnd: (endLines) => {
        activeGame.value = null
        gameFrame.value = ''
        endLines.forEach(out)
      }
    })
  }

  const navigate = (page: string) => {
    const target = page === 'home' || page === '~' || page === '/' ? '/' : `/${page}`
    out(`Navigating to ${target} ...`)
    router.push(target)
    setTimeout(close, 400)
  }

  const ctx: TerminalContext = {
    isOpen,
    lines,
    history,
    push,
    out,
    muted,
    error,
    link,
    navigate,
    close,
    startGame,
    colorMode,
    effects: {
      matrix: matrixActive,
      desktop: desktopActive,
      train: useState('fx-train', () => false),
      bootReplay: useState('boot-replay', () => false),
      party: useState('fx-party', () => false),
      toggleCrt
    },
    // commands run from event handlers, outside the Nuxt instance — wrap
    // queryCollection so it still finds the app context
    fetchPosts: () =>
      nuxtApp.runWithContext(() => queryCollection('blog').order('date', 'DESC').all()),
    getCommands: () => commands
  }

  const commands: Record<string, TerminalCommand> = {
    ...createSystemCommands(ctx),
    ...createContentCommands(ctx),
    ...createFunCommands(ctx)
  }

  const commandNames = Object.keys(commands).filter((name) => !commands[name]!.hidden)

  const { trackEvent } = useAnalytics()

  /** One pipe stage (grep/head/tail/wc) applied to captured output. */
  const applyFilter = (input: TerminalLine[], stage: string): TerminalLine[] | string => {
    const [name = '', ...rest] = stage.trim().split(/\s+/)
    switch (name) {
      case 'grep': {
        const invert = rest[0] === '-v'
        const pattern = (invert ? rest.slice(1) : rest).join(' ')
        if (!pattern) return 'grep: missing pattern'
        let matches: (text: string) => boolean
        try {
          const re = new RegExp(pattern, 'i')
          matches = (text) => re.test(text)
        } catch {
          matches = (text) => text.toLowerCase().includes(pattern.toLowerCase())
        }
        return input.filter((line) => matches(stripHtml(line.text)) !== invert)
      }
      case 'head':
      case 'tail': {
        const raw = rest[0] === '-n' ? rest[1] : rest[0]
        const n = Number(raw ?? 10)
        const count = Number.isFinite(n) && n > 0 ? n : 10
        return name === 'head' ? input.slice(0, count) : input.slice(-count)
      }
      case 'wc':
        return [{ id: lineId++, type: 'output', text: String(input.length) }]
      default:
        return `lvsh: unknown filter: ${name} (pipes support grep, head, tail, wc)`
    }
  }

  const run = (input: string) => {
    const trimmed = input.trim()
    push('input', trimmed)
    if (!trimmed) return
    history.value.push(trimmed)
    saveHistory()

    const [commandPart = '', ...pipeStages] = trimmed.split('|').map((part) => part.trim())
    const [name = '', ...args] = commandPart.split(/\s+/)
    const command = commands[name.toLowerCase()]
    if (!command) {
      error(`lvsh: command not found: ${name}`)
      muted(`Type 'help' for available commands.`)
      return
    }
    // count which commands get used — names only, never arguments
    trackEvent(`terminal/${name.toLowerCase()}`)

    if (!pipeStages.length) {
      command.exec(args)
      return
    }

    // piped: capture the command's output, run it through the filters
    const captured: TerminalLine[] = []
    sink = (line) => captured.push(line)
    const finish = () => {
      sink = null
      let result = captured
      for (const stage of pipeStages) {
        const filtered = applyFilter(result, stage)
        if (typeof filtered === 'string') {
          error(filtered)
          return
        }
        result = filtered
      }
      if (!result.length) muted('(no output)')
      result.forEach((line) => lines.value.push(line))
    }
    try {
      const outcome = command.exec(args)
      if (outcome instanceof Promise) outcome.finally(finish)
      else finish()
    } catch (err) {
      sink = null
      throw err
    }
  }

  const complete = (input: string): string | undefined => {
    const raw = input.trimStart().toLowerCase()
    if (!raw) return undefined
    // no space yet: complete the command name itself
    if (!raw.includes(' ')) {
      const match = commandNames.find((name) => name.startsWith(raw))
      return match ? `${match} ` : undefined
    }
    // complete the first argument from the command's own candidates
    const [name = '', ...rest] = raw.split(/\s+/)
    const partial = rest.join(' ')
    const candidates = commands[name]?.argCandidates?.() ?? []
    const match = candidates.find((candidate) => candidate.toLowerCase().startsWith(partial))
    return match ? `${name} ${match}` : undefined
  }

  return { isOpen, lines, history, open, close, toggle, run, complete, activeGame, gameFrame }
}
