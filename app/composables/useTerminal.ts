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

  const push = (type: TerminalLine['type'], text: string, html = false) => {
    lines.value.push({ id: lineId++, type, text, html })
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

  const run = (input: string) => {
    const trimmed = input.trim()
    push('input', trimmed)
    if (!trimmed) return
    history.value.push(trimmed)

    const [name = '', ...args] = trimmed.split(/\s+/)
    const command = commands[name.toLowerCase()]
    if (command) {
      // count which commands get used — names only, never arguments
      trackEvent(`terminal/${name.toLowerCase()}`)
      command.exec(args)
    } else {
      error(`lvsh: command not found: ${name}`)
      muted(`Type 'help' for available commands.`)
    }
  }

  const complete = (input: string): string | undefined => {
    const partial = input.trimStart().toLowerCase()
    if (!partial || partial.includes(' ')) return undefined
    return commandNames.find((name) => name.startsWith(partial))
  }

  return { isOpen, lines, history, open, close, toggle, run, complete, activeGame, gameFrame }
}
