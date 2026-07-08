import type { GameHandle, GameCallbacks } from '~/utils/terminalGames'
import type { TerminalLine, TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createContentCommands } from '~/utils/terminal/contentCommands'
import { createSystemCommands } from '~/utils/terminal/systemCommands'
import { createFunCommands } from '~/utils/terminal/funCommands'
import { expandEnv, parseCommandLine, applyFilter, splitOutputRedirect, stripHtml } from '~/utils/terminal/pipeline'
import { completeInput } from '~/utils/terminal/completion'
import { loadHistory, saveHistory } from '~/utils/terminal/history'
import { loadFs, saveFs, writeFileAt } from '~/utils/terminal/filesystem'
import type { Filesystem } from '~/utils/terminal/filesystem'
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
  const route = useRoute()
  const nuxtApp = useNuxtApp()

  // current directory inside the home filesystem ('' = home). When set, it wins
  // over the route for the prompt; otherwise the cwd tracks the route.
  const fsCwd = useState('terminal-fs-cwd', () => '')
  const cwd = computed(() => {
    if (fsCwd.value) return `~/${fsCwd.value}`
    const path = route.path.replace(/\/+$/, '')
    return path === '' ? '~' : `~${path}`
  })
  const colorMode = useColorMode()
  const { matrixActive, toggleCrt } = useSiteEffects()
  const { accent, accents, setAccent } = useAccent()
  const { name: identityName, setName } = useIdentity()

  // command history survives visits (restored once, then kept in shared state)
  const restored = loadHistory()
  if (restored) history.value = restored

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
    cwd,
    push,
    out,
    muted,
    error,
    link,
    navigate,
    close,
    startGame,
    colorMode,
    identity: {
      name: identityName,
      set: setName
    },
    accent: {
      current: accent,
      names: accents.map((a) => a.name),
      set: (name: string) => setAccent(name) !== undefined
    },
    effects: {
      matrix: matrixActive,
      train: useState('fx-train', () => false),
      bootReplay: useState('boot-replay', () => false),
      party: useState('fx-party', () => false),
      toggleCrt
    },
    // commands run from event handlers, outside the Nuxt instance — wrap
    // queryCollection so it still finds the app context
    fetchPosts: () =>
      nuxtApp.runWithContext(() => queryCollection('blog').order('date', 'DESC').all()),
    env: useState<Record<string, string>>('terminal-env', () => ({
      USER: identityName.value,
      HOME: `/home/${identityName.value}`,
      PWD: '~',
      SHELL: 'lvsh',
      HOST: profile.domain
    })),
    aliases: useState<Record<string, string>>('terminal-aliases', () => ({
      ll: 'ls',
      cls: 'clear'
    })),
    files: useState<Filesystem>('terminal-fs', () => ({})),
    fsCwd,
    getCommands: () => commands
  }

  // restore the saved home filesystem once, then persist changes across visits
  const savedFs = loadFs()
  if (savedFs && Object.keys(savedFs).length) ctx.files.value = savedFs
  if (import.meta.client) watch(ctx.files, (fs) => saveFs(fs), { deep: true })

  // keep $USER / $HOME in sync when the visitor renames themselves
  watch(identityName, (n) => {
    ctx.env.value = { ...ctx.env.value, USER: n, HOME: `/home/${n}` }
  })

  const commands: Record<string, TerminalCommand> = {
    ...createSystemCommands(ctx),
    ...createContentCommands(ctx),
    ...createFunCommands(ctx)
  }

  const commandNames = Object.keys(commands).filter((name) => !commands[name]!.hidden)

  const { trackEvent } = useAnalytics()

  const makeLine = (text: string): TerminalLine => ({ id: lineId++, type: 'output', text })

  const run = (input: string) => {
    const trimmed = input.trim()
    push('input', trimmed)
    if (!trimmed) return
    history.value.push(trimmed)
    saveHistory(history.value)

    const expanded = expandEnv(trimmed, ctx.env.value)
    const { command: cmdLine, file: redirectFile, append } = splitOutputRedirect(expanded)
    const { name, args, pipeStages } = parseCommandLine(cmdLine, ctx.aliases.value)
    const command = commands[name.toLowerCase()]
    if (!command) {
      error(`lvsh: command not found: ${name}`)
      muted(`Type 'help' for available commands.`)
      return
    }
    // count which commands get used — names only, never arguments
    trackEvent(`terminal/${name.toLowerCase()}`)

    if (!pipeStages.length && !redirectFile) {
      command.exec(args)
      return
    }

    // capture the command's output to run through filters and/or a redirect
    const captured: TerminalLine[] = []
    sink = (line) => captured.push(line)
    const finish = () => {
      sink = null
      let result = captured
      for (const stage of pipeStages) {
        const filtered = applyFilter(result, stage, makeLine)
        if ('error' in filtered) {
          error(filtered.error)
          return
        }
        result = filtered.lines
      }
      if (redirectFile) {
        const written = writeFileAt(
          ctx.files.value,
          ctx.fsCwd.value,
          redirectFile,
          result.map((line) => stripHtml(line.text)).join('\n'),
          append
        )
        if ('error' in written) return error(`lvsh: ${written.error}`)
        ctx.files.value = written.files
        return
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

  const complete = (input: string): string[] => completeInput(input, commandNames, commands)

  // files is shared with the lvOS Files app, which browses the same home fs
  return { isOpen, lines, history, cwd, open, close, toggle, run, complete, greet, activeGame, gameFrame, files: ctx.files }
}
