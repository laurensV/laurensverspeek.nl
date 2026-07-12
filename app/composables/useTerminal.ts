import type { GameHandle, GameCallbacks } from '~/utils/terminalGames'
import type { TerminalLine, TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createContentCommands } from '~/utils/terminal/contentCommands'
import { createSystemCommands } from '~/utils/terminal/systemCommands'
import { createFunCommands } from '~/utils/terminal/funCommands'
import { applyFilter, stripHtml } from '~/utils/terminal/pipeline'
import { completeInput } from '~/utils/terminal/completion'
import { nearestCommand } from '~/utils/terminal/nearestCommand'
import { createPager } from '~/utils/terminal/pager'
import { escapeHtml } from '~/utils/escapeHtml'
import { loadHistory, saveHistory } from '~/utils/terminal/history'
import { planRun } from '~/utils/terminal/planRun'
import { splitChain, shouldRunNext } from '~/utils/terminal/chain'
import type { ChainOp, ChainSegment } from '~/utils/terminal/chain'
import { writeFileAt } from '~/utils/terminal/filesystem'
import { wireTerminalStorage } from '~/utils/terminal/terminalStorage'
import { paneOrder, canSplit, nextFocus, focusAfterClose } from '~/utils/terminal/panes'
import type { SplitDir } from '~/utils/terminal/panes'
import { greetingLine } from '~/utils/terminal/greeting'
import { shellError } from '~/utils/terminal/errors'
import type { Filesystem } from '~/utils/terminal/filesystem'
import { profile } from '~/data/profile'

export type { TerminalLine } from '~/utils/terminal/types'

let lineId = 0
// tmux-style pane ids stay unique across splits for the whole visit
let paneIdCounter = 1
// the page title saved before the terminal started reflecting commands into it;
// module-scoped so the run-instance and the close-instance share it
let savedTitle: string | null = null

// Game state lives at module scope: only ever touched client-side,
// and shared by every useTerminal() caller.
const activeGame = shallowRef<GameHandle | null>(null)
const gameFrame = ref('')
// what's running, for the process table (ps/kill and the lvOS task manager)
const activeGameName = ref('game')

/**
 * Shared terminal state + command interpreter.
 * State lives in useState so the navbar, footer and overlay all talk to the
 * same terminal instance. The commands themselves are defined in per-domain
 * modules under app/utils/terminal/.
 */
export function useTerminal() {
  const isOpen = useState(STATE_KEYS.terminalOpen, () => false)
  const lines = useState<TerminalLine[]>(STATE_KEYS.terminalLines, () => [])
  const history = useState<string[]>(STATE_KEYS.terminalHistory, () => [])

  // tmux-style panes: pane 0 is the classic transcript above; extras carry
  // their own scrollback. All panes share the one shell (history, env, fs) —
  // the same way real tmux panes share the OS.
  const extraPanes = useState<{ id: number, lines: TerminalLine[] }[]>(STATE_KEYS.terminalPanes, () => [])
  const activePane = useState(STATE_KEYS.terminalActivePane, () => 0)
  const paneDir = useState<SplitDir>(STATE_KEYS.terminalPaneDir, () => 'cols')

  const router = useRouter()
  const nuxtApp = useNuxtApp()

  // current directory inside the home filesystem ('' = home). The prompt is
  // purely filesystem-driven — the same shell shows the same place whether it
  // opened as the site overlay or inside an lvOS window.
  const fsCwd = useState(STATE_KEYS.terminalFsCwd, () => '')
  const cwd = computed(() => (fsCwd.value ? `~/${fsCwd.value}` : '~'))
  const colorMode = useColorMode()
  const effectFlags = useEffectFlags()
  const { accent, accents, setAccent } = useAccent()
  const { name: identityName, setName } = useIdentity()

  // command history survives visits (restored once, then kept in shared state)
  const restored = loadHistory()
  if (restored) history.value = restored

  // output sink indirection: pipes temporarily capture lines instead of printing
  let sink: ((line: TerminalLine) => void) | null = null
  // a command's "exit status": did it print an error line while running? Chains
  // (`&&` / `||`) short-circuit on this.
  let runFailed = false

  // the transcript array of one pane (0 = the classic shared one)
  const paneLines = (id: number): TerminalLine[] =>
    id === 0 ? lines.value : extraPanes.value.find((pane) => pane.id === id)?.lines ?? lines.value

  // real terminals don't remember forever either — without a cap the transcript
  // grows unbounded for the whole session (tail -f alone feeds it ~1.2 lines/s)
  const SCROLLBACK_MAX = 1500

  const push = (type: TerminalLine['type'], text: string, html = false) => {
    const line: TerminalLine = { id: lineId++, type, text, html }
    if (type === 'error') runFailed = true
    if (sink) {
      sink(line)
      return
    }
    const pane = paneLines(activePane.value)
    pane.push(line)
    if (pane.length > SCROLLBACK_MAX) pane.splice(0, pane.length - SCROLLBACK_MAX)
  }
  const out = (text: string) => push('output', text)
  const muted = (text: string) => push('muted', text)
  const error = (text: string) => push('error', text)
  const link = (label: string, url: string) => {
    // callers pass authored data today, but escape anyway so a future caller
    // handing us a fetched title or url can't inject
    const href = /^(https?:)?\/\//i.test(url) || url.startsWith('/') || url.startsWith('mailto:') || url.startsWith('#') ? url : '#'
    push('output', `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`, true)
  }

  const greet = () => {
    push('primary', `Welcome to ${profile.domain} v2.0.0`)
    muted(greetingLine(new Date().getHours()))
    muted(`Type 'help' to see available commands, 'exit' or Esc to close.`)
  }

  const open = () => {
    if (!lines.value.length) greet()
    isOpen.value = true
  }
  // reflect the running command in the browser tab; restore the page's own
  // title when the terminal closes
  const reflectTitle = (command: string) => {
    if (!import.meta.client) return
    if (savedTitle === null) savedTitle = document.title
    document.title = `~ ${command} — ${profile.domain}`
  }
  const restoreTitle = () => {
    if (import.meta.client && savedTitle !== null) {
      document.title = savedTitle
      savedTitle = null
    }
  }

  const close = () => {
    activeGame.value?.stop()
    activeGame.value = null
    isOpen.value = false
    restoreTitle()
  }
  const toggle = () => (isOpen.value ? close() : open())

  const startGame = (create: (callbacks: GameCallbacks) => GameHandle, name = 'game') => {
    // stop any game already running, or its timers keep firing and clobber the
    // new one's frames (reachable via `sh` scripts that launch two games)
    activeGame.value?.stop()
    activeGameName.value = name
    activeGame.value = create({
      onFrame: (frame) => (gameFrame.value = frame),
      onEnd: (endLines) => {
        activeGame.value = null
        gameFrame.value = ''
        endLines.forEach(out)
      }
    })
  }

  // the running game/editor as a killable process (ps/kill, lvOS task manager)
  const game = {
    name: () => (activeGame.value ? activeGameName.value : null),
    stop: () => {
      activeGame.value?.stop()
      activeGame.value = null
      gameFrame.value = ''
    }
  }

  // braille spinner label shown under the transcript while a command fetches
  const spinnerLabel = useState(STATE_KEYS.terminalSpinner, () => '')
  const spin = (label: string) => {
    spinnerLabel.value = label
    return () => {
      if (spinnerLabel.value === label) spinnerLabel.value = ''
    }
  }

  const navigate = (page: string) => {
    const target = page === 'home' || page === '~' || page === '/' ? '/' : `/${page}`
    out(`Navigating to ${target} ...`)
    void router.push(target)
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
    spin,
    startGame,
    game,
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
    effects: effectFlags,
    // commands run from event handlers, outside the Nuxt instance — wrap
    // queryCollection so it still finds the app context
    fetchPosts: () =>
      nuxtApp.runWithContext(() => queryCollection('blog').order('date', 'DESC').all()),
    fetchSearchSections: () =>
      nuxtApp.runWithContext(() => queryCollectionSearchSections('blog')),
    env: useState<Record<string, string>>(STATE_KEYS.terminalEnv, () => ({
      USER: identityName.value,
      HOME: `/home/${identityName.value}`,
      PWD: '~',
      SHELL: 'lvsh',
      HOST: profile.domain
    })),
    aliases: useState<Record<string, string>>(STATE_KEYS.terminalAliases, () => ({
      ll: 'ls',
      cls: 'clear'
    })),
    files: useState<Filesystem>(STATE_KEYS.terminalFs, () => ({})),
    fsCwd,
    // defined below; command exec only ever runs after setup completes
    runScript: (scriptLines) => runScript(scriptLines),
    panes: {
      split: (dir) => splitPane(dir),
      count: () => paneIds.value.length,
      clearActive: () => {
        paneLines(activePane.value).length = 0
      }
    },
    getCommands: () => commands
  }

  // restore + persist the fs/aliases/env, seed the site pages, sync $PWD/$USER,
  // and warn on a full localStorage (see terminalStorage)
  wireTerminalStorage(ctx, { identityName, cwd })

  const commands: Record<string, TerminalCommand> = {
    ...createSystemCommands(ctx),
    ...createContentCommands(ctx),
    ...createFunCommands(ctx)
  }

  const commandNames = Object.keys(commands).filter((name) => !commands[name]!.hidden)

  const { trackEvent } = useAnalytics()

  const makeLine = (text: string): TerminalLine => ({ id: lineId++, type: 'output', text })

  /**
   * Run one chain segment: parse/expand (pure), then execute with pipes,
   * redirect and the `| copy` sink. Returns whether the command succeeded
   * (printed no error line) so chains can short-circuit; async commands
   * resolve to their status. `record` writes the expanded line to history —
   * chains record the whole line once instead.
   */
  const runSegment = (
    segment: string,
    historyCtx: string[],
    record: boolean
  ): boolean | Promise<boolean> => {
    runFailed = false
    const plan = planRun(segment, {
      aliases: ctx.aliases.value,
      env: ctx.env.value,
      history: historyCtx
    })
    if ('error' in plan) {
      error(plan.error)
      return false
    }
    const { commandLine, expanded, name, args, pipeStages, toClipboard, toPager, redirectFile, append } = plan
    if (expanded) muted(commandLine) // echo what actually runs
    if (record) {
      history.value.push(commandLine)
      saveHistory(history.value)
    }

    const command = commands[name.toLowerCase()]
    if (!command) {
      error(shellError(`command not found: ${name}`))
      const guess = nearestCommand(name, commandNames)
      if (guess) muted(`Did you mean '${guess}'? (or type 'help')`)
      else muted(`Type 'help' for available commands.`)
      return false
    }
    trackEvent(analyticsEvents.terminalCommand(name))
    reflectTitle(name.toLowerCase())

    if (!pipeStages.length && !redirectFile && !toClipboard && !toPager) {
      const outcome = command.exec(args)
      if (outcome instanceof Promise) return outcome.then(() => !runFailed)
      return !runFailed
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
      if (toClipboard) {
        const text = result.map((line) => stripHtml(line.text)).join('\n')
        navigator.clipboard.writeText(text)
          .then(() => muted(`copied ${result.length} line${result.length === 1 ? '' : 's'} to the clipboard`))
          .catch(() => error('copy: the clipboard said no'))
        return
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
      if (toPager) {
        // page the output in a less-style takeover instead of dumping it
        const textLines = result.flatMap((line) => stripHtml(line.text).split('\n'))
        if (!textLines.length) return muted('(no output)')
        startGame((callbacks) => createPager(textLines, callbacks), 'less')
        return
      }
      if (!result.length) muted('(no output)')
      const target = paneLines(activePane.value)
      result.forEach((line) => target.push(line))
    }
    try {
      const outcome = command.exec(args)
      if (outcome instanceof Promise) return outcome.then(() => { finish(); return !runFailed })
      finish()
      return !runFailed
    } catch (err) {
      sink = null
      throw err
    }
  }

  const executeLine = async (trimmed: string, segments: ChainSegment[]) => {
    if (segments.length === 1) {
      await runSegment(trimmed, history.value, true)
      return
    }
    // a chain records the full line once; `!!` inside segments expands against
    // the history as it was before this line
    const historySnapshot = [...history.value]
    history.value.push(trimmed)
    saveHistory(history.value)
    let ok = true
    let op: ChainOp | null = null
    for (const segment of segments) {
      if (op === null || shouldRunNext(op, ok)) {
        ok = await runSegment(segment.cmd, historySnapshot, false)
      }
      op = segment.op
    }
  }

  // Commands run one at a time. An async command (curl, weather, git log) emits
  // its output after an await, while `sink`/`runFailed` are single closure
  // variables; letting a second command run in that gap corrupted the first's
  // pipe/redirect (a `curl | jq` could dump raw JSON, or `> file` write empty).
  // Chaining every line onto one promise keeps the capture sink to one owner.
  let runQueue: Promise<void> = Promise.resolve()

  const run = (input: string) => {
    const trimmed = input.trim()
    push('input', trimmed)
    if (!trimmed) return
    const chain = splitChain(trimmed)
    if ('error' in chain) {
      error(chain.error)
      return
    }
    runQueue = runQueue.then(() => executeLine(trimmed, chain.segments)).catch(() => {
      // runSegment already surfaces command errors as lines; swallow unexpected
      // throws so one bad command can't wedge the queue for every later one
    })
  }

  const complete = (input: string): string[] => completeInput(input, commandNames, commands)

  // `sh` script runner: execute lines sequentially with an sh -x style trace.
  // The depth guard turns fork bombs into a joke instead of a hang.
  let scriptDepth = 0
  const runScript = async (scriptLines: string[]) => {
    if (scriptDepth >= 3) {
      error('sh: maximum script recursion reached — nice fork bomb though.')
      return
    }
    scriptDepth++
    try {
      for (const raw of scriptLines) {
        const trimmed = raw.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        push('muted', `+ ${trimmed}`)
        const chain = splitChain(trimmed)
        if ('error' in chain) {
          error(chain.error)
          continue
        }
        let ok = true
        let op: ChainOp | null = null
        for (const segment of chain.segments) {
          if (op === null || shouldRunNext(op, ok)) {
            ok = await runSegment(segment.cmd, history.value, false)
          }
          op = segment.op
        }
      }
    } finally {
      scriptDepth--
    }
  }

  // ── tmux-style pane management ────────────────────────────────────────────
  const paneIds = computed(() => paneOrder(extraPanes.value.map((pane) => pane.id)))

  const splitPane = (dir: SplitDir): boolean => {
    if (!canSplit(paneIds.value.length)) return false
    if (!extraPanes.value.length) paneDir.value = dir
    const id = paneIdCounter++
    extraPanes.value = [...extraPanes.value, {
      id,
      lines: [{ id: lineId++, type: 'muted', text: '(new pane — same shell, own scrollback. ctrl+b x closes it.)' }]
    }]
    activePane.value = id
    return true
  }

  const closePane = (id: number): 'closed' | 'root' => {
    if (id === 0) return 'root'
    const order = paneIds.value
    extraPanes.value = extraPanes.value.filter((pane) => pane.id !== id)
    if (activePane.value === id) activePane.value = focusAfterClose(order, id)
    return 'closed'
  }

  const panes = {
    ids: paneIds,
    active: activePane,
    dir: paneDir,
    linesFor: paneLines,
    clear: (id: number) => {
      if (id === 0) lines.value = []
      else {
        const pane = extraPanes.value.find((entry) => entry.id === id)
        if (pane) pane.lines = []
      }
    },
    split: splitPane,
    close: closePane,
    focusStep: (step: 1 | -1) => {
      activePane.value = nextFocus(paneIds.value, activePane.value, step)
    },
    setActive: (id: number) => {
      if (paneIds.value.includes(id)) activePane.value = id
    }
  }

  // files is shared with the lvOS Files app, which browses the same home fs;
  // game is exposed so the lvOS task manager can list and kill it
  return { isOpen, lines, history, cwd, open, close, toggle, run, complete, greet, activeGame, gameFrame, spinnerLabel, files: ctx.files, panes, game }
}
