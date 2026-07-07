import { projects, categories, type ProjectCategory } from '~/data/projects'
import { profile } from '~/data/profile'
import { uses as usesData } from '~/data/uses'
import { createSnakeGame, createHangmanGame, type GameHandle, type GameCallbacks } from '~/utils/terminalGames'
import { cowsay, fortune, figlet } from '~/utils/terminalToys'

export interface TerminalLine {
  id: number
  type: 'input' | 'output' | 'error' | 'muted' | 'primary'
  text: string
  /** Render as trusted HTML — only ever set for content we author ourselves */
  html?: boolean
}

interface TerminalCommand {
  usage?: string
  description: string
  hidden?: boolean
  exec: (args: string[]) => void
}

const PAGES = ['home', 'projects', 'blog', 'about', 'uses', 'cv', 'contact'] as const

const ASCII_LOGO = String.raw`
 _    __      __
| |   \ \    / /
| |    \ \  / /
| |___  \ \/ /
|_____|  \__/
`

let lineId = 0

// Game state lives at module scope: only ever touched client-side,
// and shared by every useTerminal() caller.
const activeGame = shallowRef<GameHandle | null>(null)
const gameFrame = ref('')

/**
 * Shared terminal state + command interpreter.
 * State lives in useState so the navbar, footer and overlay all talk to the same terminal.
 */
export function useTerminal() {
  const isOpen = useState('terminal-open', () => false)
  const lines = useState<TerminalLine[]>('terminal-lines', () => [])
  const history = useState<string[]>('terminal-history', () => [])

  const router = useRouter()
  const colorMode = useColorMode()
  const { matrixActive, desktopActive, toggleCrt } = useSiteEffects()
  const trainActive = useState('fx-train', () => false)
  const bootReplay = useState('boot-replay', () => false)

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

  const listProjects = (category?: ProjectCategory) => {
    const list = category ? projects.filter((p) => p.category === category) : projects
    if (!list.length) {
      muted(`No projects in category '${category}'.`)
      return
    }
    for (const p of list) {
      push(
        'output',
        `<span class="term-accent">${p.slug.padEnd(28, ' ')}</span> [${p.category}] ${p.title}`,
        true
      )
    }
    muted(`\nUse 'open <name>' to visit a project, e.g. 'open ${list[0]!.slug}'.`)
  }

  const commands: Record<string, TerminalCommand> = {
    help: {
      description: 'List available commands',
      exec: () => {
        for (const [name, cmd] of Object.entries(commands)) {
          if (cmd.hidden) continue
          push(
            'output',
            `<span class="term-accent">${(cmd.usage ?? name).padEnd(24, ' ')}</span> ${cmd.description}`,
            true
          )
        }
        muted(`\nTip: use ↑/↓ for history and Tab to autocomplete.`)
      }
    },
    about: {
      description: 'Who is Laurens?',
      exec: () => profile.bio.forEach(out)
    },
    whoami: {
      description: 'Who are you?',
      exec: () => {
        out('visitor')
        muted(`(I'm ${profile.name} though — try 'about')`)
      }
    },
    projects: {
      usage: 'projects [category]',
      description: `List projects (${categories.map((c) => c.value).join(', ')})`,
      exec: (args) => {
        const cat = args[0]?.toLowerCase() as ProjectCategory | undefined
        if (cat && !categories.some((c) => c.value === cat)) {
          error(`Unknown category '${cat}'. Try: ${categories.map((c) => c.value).join(', ')}`)
          return
        }
        listProjects(cat)
      }
    },
    open: {
      usage: 'open <project>',
      description: 'Open a project in a new tab',
      exec: (args) => {
        if (!args[0]) {
          error(`Usage: open <project> — run 'projects' to see the list.`)
          return
        }
        const query = args[0].toLowerCase()
        const project = projects.find(
          (p) => p.slug === query || p.title.toLowerCase().includes(query)
        )
        if (!project) {
          error(`Project '${args[0]}' not found. Run 'projects' to see the list.`)
          return
        }
        const url = project.url ?? project.source
        if (!url) {
          error(`No link available for ${project.title}.`)
          return
        }
        out(`Opening ${project.title} ...`)
        window.open(url, '_blank', 'noopener')
      }
    },
    cat: {
      usage: 'cat <project>',
      description: 'Read all about a project',
      exec: (args) => {
        if (!args[0]) {
          error(`Usage: cat <project> — run 'projects' to see the list.`)
          return
        }
        const query = args[0].toLowerCase().replace(/\.md$/, '')
        const project = projects.find(
          (p) => p.slug === query || p.title.toLowerCase().includes(query)
        )
        if (!project) {
          error(`cat: ${args[0]}: No such file or directory`)
          return
        }
        push('primary', `# ${project.title}`)
        muted(`${project.year ?? ''}${project.year && project.role ? ' · ' : ''}${project.role ?? ''}`)
        for (const paragraph of project.story ?? [project.description]) {
          out('')
          out(paragraph)
        }
        out('')
        link(`Read in style → /projects/${project.slug}`, `/projects/${project.slug}`)
      }
    },
    cd: {
      usage: 'cd <page>',
      description: `Go to a page (${PAGES.join(', ')})`,
      exec: (args) => {
        const page = (args[0] ?? 'home').replace(/^\/|\/$/g, '').toLowerCase() || 'home'
        if (page !== '~' && !PAGES.includes(page as (typeof PAGES)[number])) {
          error(`cd: no such page: ${args[0]}`)
          return
        }
        navigate(page)
      }
    },
    ls: {
      description: 'List pages',
      exec: () => out(PAGES.map((p) => `${p}/`).join('  '))
    },
    cv: {
      description: 'View my CV (printable)',
      exec: () => navigate('cv')
    },
    blog: {
      description: 'Read the blog',
      exec: () => navigate('blog')
    },
    uses: {
      description: 'Gear, software and stack I use',
      exec: () => {
        for (const group of usesData) {
          push('primary', `./${group.group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
          for (const item of group.items) {
            push(
              'output',
              `<span class="term-accent">${item.name.padEnd(24, ' ')}</span> ${item.note ?? ''}`,
              true
            )
          }
          out('')
        }
        muted(`Full list at /uses — or run 'cd uses'.`)
      }
    },
    contact: {
      description: 'How to reach me',
      exec: () => {
        link(`mail    ${profile.email}`, `mailto:${profile.email}`)
        for (const social of profile.socials.filter((s) => !s.url.startsWith('mailto:'))) {
          link(`${social.label.toLowerCase().padEnd(8, ' ')}${social.url}`, social.url)
        }
      }
    },
    github: {
      description: 'Live stats from the GitHub API',
      exec: () => {
        muted('Fetching from api.github.com ...')
        $fetch<{ followers: number, public_repos: number }>(
          `https://api.github.com/users/${GITHUB_USER}`
        )
          .then((user) => {
            push('output', `<span class="term-accent">user</span>       ${GITHUB_USER}`, true)
            push('output', `<span class="term-accent">repos</span>      ${user.public_repos}`, true)
            push('output', `<span class="term-accent">followers</span>  ${user.followers}`, true)
            link(`profile    github.com/${GITHUB_USER}`, `https://github.com/${GITHUB_USER}`)
          })
          .catch(() => error('github: API unreachable (rate limit or offline)'))
      }
    },
    theme: {
      usage: 'theme <dark|light|system>',
      description: 'Change the color theme',
      exec: (args) => {
        const value = args[0]?.toLowerCase()
        if (!value || !['dark', 'light', 'system'].includes(value)) {
          out(`Current theme: ${colorMode.preference}`)
          muted('Usage: theme <dark|light|system>')
          return
        }
        colorMode.preference = value
        out(`Theme set to ${value}.`)
      }
    },
    cowsay: {
      usage: 'cowsay <text>',
      description: 'A cow says your text',
      exec: (args) => out(cowsay(args.join(' ')))
    },
    figlet: {
      usage: 'figlet <text>',
      description: 'Big ASCII banner text',
      exec: (args) => push('primary', figlet(args.join(' ')))
    },
    fortune: {
      description: 'Words of dubious wisdom',
      exec: () => out(fortune())
    },
    sl: {
      hidden: true,
      description: 'You meant ls. Enjoy the ride.',
      exec: () => {
        muted(`You typed 'sl' instead of 'ls', didn't you? Enjoy the ride.`)
        trainActive.value = true
        setTimeout(close, 600)
      }
    },
    reboot: {
      description: 'Replay the boot sequence',
      exec: () => {
        out('Rebooting...')
        setTimeout(() => {
          isOpen.value = false
          bootReplay.value = true
        }, 400)
      }
    },
    desktop: {
      description: 'Boot the lvOS desktop environment',
      exec: () => {
        push('primary', 'Booting lvOS 2.0 ...')
        muted('Tip: Esc or the start menu logs you out again.')
        setTimeout(() => {
          desktopActive.value = true
          isOpen.value = false
        }, 700)
      }
    },
    startx: {
      hidden: true,
      description: 'Alias for desktop',
      exec: () => commands.desktop!.exec([])
    },
    matrix: {
      description: 'There is no spoon',
      exec: () => {
        push('primary', 'Wake up, Neo...')
        muted('The Matrix has you. Click or press any key to escape.')
        setTimeout(() => {
          matrixActive.value = true
          isOpen.value = false
        }, 900)
      }
    },
    crt: {
      description: 'Toggle retro CRT mode',
      exec: () => {
        const on = toggleCrt()
        out(on ? 'CRT mode enabled. Welcome back to 1985.' : 'CRT mode disabled. Back to the future.')
      }
    },
    snake: {
      description: 'Play snake in the terminal',
      exec: () => {
        muted('Starting snake... arrows/wasd to move, q to quit.')
        startGame(createSnakeGame)
      }
    },
    hangman: {
      description: 'Play hangman (a 2014 classic, remastered)',
      exec: () => {
        muted('Starting hangman... type letters to guess, q to quit.')
        startGame(createHangmanGame)
      }
    },
    neofetch: {
      description: 'System information',
      exec: () => {
        push('primary', ASCII_LOGO)
        const info: [string, string][] = [
          ['host', `visitor@${profile.domain}`],
          ['os', 'Nuxt 4 (Vue 3) x86_64'],
          ['shell', 'lvsh 2.0.0'],
          ['theme', colorMode.value],
          ['location', profile.location],
          ['work', 'CTO @ Nosana, co-founder @ Effect.AI'],
          ['uptime', `${new Date().getFullYear() - 2022} years (site v1 shipped in 2022)`]
        ]
        for (const [key, value] of info) {
          push('output', `<span class="term-accent">${key.padEnd(10, ' ')}</span> ${value}`, true)
        }
      }
    },
    echo: {
      usage: 'echo <text>',
      description: 'Print text',
      exec: (args) => out(args.join(' '))
    },
    date: {
      description: 'Print the current date',
      exec: () => out(new Date().toString())
    },
    history: {
      description: 'Show command history',
      exec: () => history.value.forEach((cmd, i) => out(`${String(i + 1).padStart(3, ' ')}  ${cmd}`))
    },
    clear: {
      description: 'Clear the terminal',
      exec: () => (lines.value = [])
    },
    exit: {
      description: 'Close the terminal',
      exec: () => {
        out('logout')
        setTimeout(close, 200)
      }
    },
    secrets: {
      hidden: true,
      description: 'List the hidden commands',
      exec: () => {
        push('primary', 'You found the secret list. The hidden commands are:')
        for (const [name, cmd] of Object.entries(commands)) {
          if (!cmd.hidden || name === 'secrets') continue
          push(
            'output',
            `<span class="term-accent">${name.padEnd(24, ' ')}</span> ${cmd.description}`,
            true
          )
        }
        muted(`\n(there might be more... check the browser console 👀)`)
      }
    },
    sudo: {
      hidden: true,
      description: 'Absolutely not',
      exec: () => error('visitor is not in the sudoers file. This incident will be reported. 😏')
    },
    rm: {
      hidden: true,
      description: 'Please no',
      exec: (args) =>
        args.join(' ').includes('-rf')
          ? error('Nice try. I only just finished this website.')
          : error('rm: permission denied')
    },
    vim: {
      hidden: true,
      description: 'Trap',
      exec: () => muted(`You are now stuck in vim. Just kidding — this is not a real shell. :q!`)
    }
  }

  const commandNames = Object.keys(commands).filter((name) => !commands[name]!.hidden)

  const run = (input: string) => {
    const trimmed = input.trim()
    push('input', trimmed)
    if (!trimmed) return
    history.value.push(trimmed)

    const [name = '', ...args] = trimmed.split(/\s+/)
    const command = commands[name.toLowerCase()]
    if (command) {
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
