import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { renderCalendar } from '~/utils/terminal/calendar'
import { parseRedirect, resolvePath, dirEntries, expandFileArgs, writeFileAt } from '~/utils/terminal/filesystem'
import { formatGitLog, formatGitShow, findCommit, type GitCommit } from '~/utils/terminal/gitLog'
import { createNanoEditor, createVimEditor, type EditorIO } from '~/utils/terminalEditors'
import { collectStorageSlices, dfLines, duLines } from '~/utils/terminal/storageUsage'
import { groupCommands } from '~/utils/terminal/helpGroups'
import { profile } from '~/data/profile'

// the baked commit history (/git-log.json is prerendered at generate time),
// fetched once and shared by every terminal instance
let gitHistory: GitCommit[] | null = null
const loadGitHistory = async (): Promise<GitCommit[]> => {
  if (!gitHistory) gitHistory = await $fetch<GitCommit[]>('/git-log.json')
  return gitHistory
}

// Shell housekeeping: help, theme, utilities and other meta commands.

const ASCII_LOGO = String.raw`
 _    __      __
| |   \ \    / /
| |    \ \  / /
| |___  \ \/ /
|_____|  \__/
`

export function createSystemCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error } = ctx

  // captured at factory time (valid Nuxt context); command handlers run outside it.
  // Set by the ssh easter egg; the prompt's host segment follows it.
  const sshHost = useState(STATE_KEYS.terminalSshHost, () => '')
  const fontScale = useTermFontScale()

  // a path can only be created if its parent directory already exists
  const parentExists = (path: string) => {
    const parent = path.split('/').slice(0, -1).join('/')
    return parent === '' || ctx.files.value[parent]?.dir === true
  }
  // names in the current directory, for tab-completing rm
  const hereEntries = () => dirEntries(ctx.files.value, ctx.fsCwd.value).map((entry) => entry.name)

  // file access for the editors (nano/vim) over the home filesystem
  const editorIo = (name: string): EditorIO | { error: string } => {
    const path = resolvePath(ctx.fsCwd.value, name)
    if (!path || ctx.files.value[path]?.dir) return { error: `${name}: is a directory` }
    return {
      filename: name,
      read: () => ctx.files.value[path]?.content ?? '',
      write: (content) => {
        const written = writeFileAt(ctx.files.value, ctx.fsCwd.value, name, content)
        if ('error' in written) return false
        ctx.files.value = written.files
        return true
      }
    }
  }

  const openVim = (args: string[]) => {
    const name = args[0]
    if (!name) {
      muted('vim: which file? this vim is real now — try `vim todo.txt` (and yes, :q! works)')
      return
    }
    const io = editorIo(name)
    if ('error' in io) return error(`vim: ${io.error}`)
    muted(`Opening ${name} — i inserts, Esc then :wq writes & quits.`)
    ctx.startGame((callbacks) => createVimEditor(io, callbacks))
  }

  // shared cp/mv (files only): copy a node to dest, and for mv drop the source
  const copyOrMoveOne = (cmd: 'cp' | 'mv', srcName: string, dstName: string) => {
    const src = resolvePath(ctx.fsCwd.value, srcName)
    const node = ctx.files.value[src]
    if (!node) return error(`${cmd}: cannot stat '${srcName}': No such file or directory`)
    if (node.dir) return error(`${cmd}: omitting directory '${srcName}'`)
    let dst = resolvePath(ctx.fsCwd.value, dstName)
    // a directory destination keeps the source's filename
    if (ctx.files.value[dst]?.dir) dst = `${dst}/${src.split('/').pop()}`
    if (!dst) return error(`${cmd}: cannot write to the home directory`)
    if (src === dst) return
    if (!parentExists(dst)) return error(`${cmd}: cannot create '${dstName}': No such file or directory`)
    const withDest = { ...ctx.files.value, [dst]: { dir: false, content: node.content } }
    ctx.files.value = cmd === 'mv'
      ? Object.fromEntries(Object.entries(withDest).filter(([key]) => key !== src))
      : withDest
  }

  // globs expand to multiple sources; then the destination must be a directory
  const copyOrMove = (cmd: 'cp' | 'mv', args: string[]) => {
    const expanded = expandFileArgs(ctx.files.value, ctx.fsCwd.value, args)
    if (expanded.length < 2) return error(`${cmd}: missing file operand`)
    const dstName = expanded.at(-1)!
    const sources = expanded.slice(0, -1)
    if (sources.length > 1 && !ctx.files.value[resolvePath(ctx.fsCwd.value, dstName)]?.dir) {
      return error(`${cmd}: target '${dstName}' is not a directory`)
    }
    for (const srcName of sources) copyOrMoveOne(cmd, srcName, dstName)
  }

  return {
    help: {
      description: 'List available commands',
      exec: () => {
        for (const group of groupCommands(ctx.getCommands())) {
          push('primary', `## ${group.title}`)
          for (const cmd of group.commands) {
            push(
              'output',
              `<span class="term-accent">${(cmd.usage ?? cmd.name).padEnd(24, ' ')}</span> ${cmd.description}`,
              true
            )
          }
          out('')
        }
        muted(`Tip: ↑/↓ history · Tab completes · | grep filters · man <cmd> for details.`)
      }
    },
    man: {
      usage: 'man <command>',
      description: 'Show the manual page for a command',
      argCandidates: () => Object.keys(ctx.getCommands()).filter((n) => !ctx.getCommands()[n]!.hidden),
      exec: (args) => {
        if (!args[0]) {
          error('What manual page do you want? (try: man <command>)')
          return
        }
        const name = args[0].toLowerCase()
        const cmd = ctx.getCommands()[name]
        if (!cmd) {
          error(`No manual entry for ${args[0]}`)
          return
        }
        push('primary', `${name.toUpperCase()}(1)`)
        push('primary', 'NAME')
        out(`    ${name} — ${cmd.description}`)
        push('primary', 'SYNOPSIS')
        out(`    ${cmd.usage ?? name}`)
        if (cmd.examples?.length) {
          push('primary', 'EXAMPLES')
          cmd.examples.forEach((example) => muted(`    ${example}`))
        }
      }
    },
    alias: {
      usage: 'alias [name=command]',
      description: 'List or define command aliases',
      exec: (args) => {
        const joined = args.join(' ')
        if (!joined) {
          const entries = Object.entries(ctx.aliases.value)
          if (!entries.length) {
            muted('no aliases defined — try: alias g=github')
            return
          }
          for (const [name, target] of entries) {
            push('output', `<span class="term-accent">${name.padEnd(12, ' ')}</span> ${target}`, true)
          }
          return
        }
        const match = /^(\w+)=(.+)$/.exec(joined)
        if (!match) {
          error("alias: usage: alias name=command (e.g. alias g='github')")
          return
        }
        const [, name, target] = match
        ctx.aliases.value = { ...ctx.aliases.value, [name!.toLowerCase()]: target!.replace(/^['"]|['"]$/g, '') }
        out(`alias ${name} → ${target}`)
      }
    },
    unalias: {
      usage: 'unalias <name>',
      description: 'Remove a command alias',
      argCandidates: () => Object.keys(ctx.aliases.value),
      exec: (args) => {
        const name = args[0]?.toLowerCase()
        if (!name || !(name in ctx.aliases.value)) {
          error(`unalias: ${args[0] ?? ''}: not found`)
          return
        }
        ctx.aliases.value = Object.fromEntries(
          Object.entries(ctx.aliases.value).filter(([key]) => key !== name)
        )
        out(`removed alias ${name}`)
      }
    },
    env: {
      description: 'List environment variables',
      exec: () => {
        for (const [key, value] of Object.entries(ctx.env.value)) {
          push('output', `<span class="term-accent">${key}</span>=${value}`, true)
        }
      }
    },
    export: {
      usage: 'export NAME=value',
      description: 'Set an environment variable',
      exec: (args) => {
        const match = /^(\w+)=(.*)$/.exec(args.join(' '))
        if (!match) {
          error('export: usage: export NAME=value')
          return
        }
        const [, name, value] = match
        ctx.env.value = { ...ctx.env.value, [name!]: value!.replace(/^['"]|['"]$/g, '') }
        out(`${name}=${value}`)
      }
    },
    theme: {
      usage: 'theme <dark|light|system>',
      description: 'Change the color theme',
      examples: ['theme dark', 'theme system'],
      argCandidates: () => ['dark', 'light', 'system'],
      exec: (args) => {
        const value = args[0]?.toLowerCase()
        if (!value || !['dark', 'light', 'system'].includes(value)) {
          out(`Current theme: ${ctx.colorMode.preference}`)
          muted('Usage: theme <dark|light|system>')
          return
        }
        ctx.colorMode.preference = value
        out(`Theme set to ${value}.`)
      }
    },
    colorscheme: {
      usage: 'colorscheme <name>',
      description: `Change the accent color (${ctx.accent.names.join(', ')})`,
      examples: ['colorscheme emerald', 'colorscheme cyan'],
      argCandidates: () => ctx.accent.names,
      exec: (args) => {
        const name = args[0]?.toLowerCase()
        if (!name) {
          out(`Current accent: ${ctx.accent.current.value}`)
          muted(`Available: ${ctx.accent.names.join(', ')}`)
          return
        }
        if (ctx.accent.set(name)) out(`Accent set to ${name}.`)
        else error(`colorscheme: unknown accent '${args[0]}'. Try: ${ctx.accent.names.join(', ')}`)
      }
    },
    uptime: {
      description: 'How long this page has been up',
      exec: () => {
        const secs = Math.round(performance.now() / 1000)
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        const s = secs % 60
        const clock = `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`
        const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        // a load average that is pure vibes, gently rising with tab age
        const load = (Math.min(2.5, 0.2 + secs / 600)).toFixed(2)
        out(` ${now}  up ${clock},  1 user,  load average: ${load}, ${(+load * 0.8).toFixed(2)}, ${(+load * 0.6).toFixed(2)}`)
      }
    },
    neofetch: {
      description: 'System information',
      exec: () => {
        push('primary', ASCII_LOGO)
        const info: [string, string][] = [
          ['host', `${ctx.identity.name.value}@${profile.domain}`],
          ['os', 'Nuxt 4 (Vue 3) x86_64'],
          ['shell', 'lvsh 2.0.0'],
          ['theme', ctx.colorMode.value],
          ['location', profile.location],
          ['work', 'Head of Dev @ Nosana, co-founder @ Effect.AI'],
          ['uptime', `${new Date().getFullYear() - 2022} years (site v1 shipped in 2022)`]
        ]
        for (const [key, value] of info) {
          push('output', `<span class="term-accent">${key.padEnd(10, ' ')}</span> ${value}`, true)
        }
      }
    },
    pwd: {
      description: 'Print the working directory',
      exec: () => out(ctx.cwd.value.replace(/^~/, ctx.env.value.HOME ?? '/home/visitor'))
    },
    echo: {
      usage: 'echo <text> [> file]',
      description: 'Print text — or write it to a file with >',
      exec: (args) => {
        const { text, file } = parseRedirect(args)
        if (file) {
          const path = resolvePath(ctx.fsCwd.value, file)
          if (!path) return error('echo: cannot write to the home directory')
          if (!parentExists(path)) return error(`echo: ${file}: No such file or directory`)
          ctx.files.value = { ...ctx.files.value, [path]: { dir: false, content: text } }
          return
        }
        out(text)
      }
    },
    mkdir: {
      usage: 'mkdir <name>',
      description: 'Create a directory',
      exec: (args) => {
        const name = args[0]
        if (!name) return error('mkdir: missing operand')
        const path = resolvePath(ctx.fsCwd.value, name)
        if (!path) return error('mkdir: cannot create the home directory')
        if (ctx.files.value[path]) return error(`mkdir: cannot create directory '${name}': File exists`)
        if (!parentExists(path)) return error(`mkdir: cannot create directory '${name}': No such file or directory`)
        ctx.files.value = { ...ctx.files.value, [path]: { dir: true, content: '' } }
      }
    },
    touch: {
      usage: 'touch <name>',
      description: 'Create an empty file',
      exec: (args) => {
        const name = args[0]
        if (!name) return error('touch: missing file operand')
        const path = resolvePath(ctx.fsCwd.value, name)
        if (!path) return error('touch: cannot touch the home directory')
        if (!parentExists(path)) return error(`touch: cannot touch '${name}': No such file or directory`)
        if (!ctx.files.value[path]) {
          ctx.files.value = { ...ctx.files.value, [path]: { dir: false, content: '' } }
        }
      }
    },
    date: {
      description: 'Print the current date',
      exec: () => out(new Date().toString())
    },
    cal: {
      description: 'Show a calendar of the current month',
      exec: () => {
        const lines = renderCalendar(new Date())
        lines.forEach((line, i) => push(i === 0 ? 'primary' : i === 1 ? 'muted' : 'output', line))
      }
    },
    uname: {
      usage: 'uname [-a]',
      description: 'Print system information',
      argCandidates: () => ['-a'],
      exec: (args) =>
        out(args.includes('-a')
          ? `lvsh ${profile.domain} 2.0.0 #1 SMP Vue3 x86_64 lvOS`
          : 'lvsh')
    },
    which: {
      usage: 'which <command>',
      description: 'Locate a command (builtin or alias)',
      argCandidates: () => Object.keys(ctx.getCommands()).filter((n) => !ctx.getCommands()[n]!.hidden),
      exec: (args) => {
        if (!args.length) {
          error('usage: which <command>')
          return
        }
        for (const arg of args) {
          const name = arg.toLowerCase()
          if (name in ctx.aliases.value) out(`${name}: aliased to '${ctx.aliases.value[name]}'`)
          else if (ctx.getCommands()[name]) out(`${name}: lvsh builtin`)
          else error(`which: no ${arg} in (lvsh builtins)`)
        }
      }
    },
    history: {
      description: 'Show command history',
      exec: () =>
        ctx.history.value.forEach((cmd, i) => out(`${String(i + 1).padStart(3, ' ')}  ${cmd}`))
    },
    clear: {
      description: 'Clear the terminal',
      exec: () => {
        ctx.lines.value = []
      }
    },
    reboot: {
      description: 'Replay the boot sequence',
      exec: () => {
        out('Rebooting...')
        setTimeout(() => {
          ctx.isOpen.value = false
          ctx.effects.bootReplay.value = true
        }, 400)
      }
    },
    exit: {
      description: 'Close the terminal',
      exec: () => {
        // an ssh "session" disconnects first; the next exit closes for real
        if (sshHost.value) {
          out(`Connection to ${sshHost.value} closed.`)
          sshHost.value = ''
          return
        }
        out('logout')
        setTimeout(ctx.close, 200)
      }
    },
    secrets: {
      hidden: true,
      description: 'List the hidden commands',
      exec: () => {
        push('primary', 'You found the secret list. The hidden commands are:')
        for (const [name, cmd] of Object.entries(ctx.getCommands())) {
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
    sysinfo: {
      description: 'A neofetch for your browser session',
      exec: () => {
        const ua = navigator.userAgent
        const browser = /Firefox\//.test(ua) ? 'Firefox'
          : /Edg\//.test(ua) ? 'Edge'
            : /Chrome\//.test(ua) ? 'Chrome'
              : /Safari\//.test(ua) ? 'Safari' : 'a browser'
        const storageKb = (collectStorageSlices().reduce((sum, slice) => sum + slice.bytes, 0) / 1024).toFixed(1)
        const uptime = Math.round(performance.now() / 1000)
        const rows: [string, string][] = [
          ['host', `${ctx.identity.name.value}@${profile.domain}`],
          ['browser', browser],
          ['resolution', `${window.innerWidth}×${window.innerHeight}`],
          ['theme', `${ctx.colorMode.value} · accent ${ctx.accent.current.value}`],
          ['dpr', String(window.devicePixelRatio)],
          ['storage', `${storageKb} KB in localStorage`],
          ['uptime', `${uptime}s on this page`],
          ['shell', 'lvsh 2.0']
        ]
        const logo = ASCII_LOGO.split('\n').filter(Boolean)
        const maxRows = Math.max(logo.length, rows.length)
        for (let i = 0; i < maxRows; i++) {
          const art = (logo[i] ?? '').padEnd(14)
          const row = rows[i]
          if (row) push('output', `<span class="term-accent">${art}${row[0].padEnd(12)}</span> ${row[1]}`, true)
          else push('primary', art)
        }
      }
    },
    df: {
      description: 'How much localStorage this site really uses',
      exec: () => {
        for (const line of dfLines(collectStorageSlices())) push(line.type, line.text, line.html)
        muted(`\nEverything here lives in YOUR browser — nothing is stored server-side.`)
      }
    },
    du: {
      hidden: true,
      description: 'Disk usage, sorted (see also df)',
      exec: () => {
        for (const line of duLines(collectStorageSlices())) push(line.type, line.text, line.html)
      }
    },
    git: {
      usage: 'git <log|show|status>',
      description: "This site's real commit history",
      examples: [
        'git log            recent commits, baked in at build time',
        'git log --oneline  the compact version (pipes well into grep)',
        'git log -n 5       only the last five',
        'git show <hash>    one commit with its file diffstat',
        'git status         you can guess'
      ],
      argCandidates: () => ['log', 'show', 'status', 'blame', 'push'],
      exec: async (args) => {
        const [sub, ...rest] = args
        switch (sub) {
          case undefined:
            out('usage: git <log|show|status|blame|push>')
            muted("this is the real history of this website's repository")
            return
          case 'status':
            out('On branch main')
            out("Your branch is up to date with 'origin/main'.")
            out('')
            out('nothing to commit, working tree clean')
            muted('(the site you are looking at ships as static files — nothing to commit here)')
            return
          case 'blame':
            out('It was laurens. It is always laurens.')
            return
          case 'push':
            error('remote: Permission denied — nice try though.')
            return
          case 'log': {
            const commits = await loadGitHistory().catch(() => null)
            if (!commits) return error('git: could not load the commit history')
            const oneline = rest.includes('--oneline')
            const flagIndex = rest.indexOf('-n')
            const limit = oneline
              ? undefined
              : flagIndex >= 0 ? (Number(rest[flagIndex + 1]) || 15) : 15
            for (const line of formatGitLog(commits, { oneline, limit })) push(line.type, line.text, line.html)
            return
          }
          case 'show': {
            const commits = await loadGitHistory().catch(() => null)
            if (!commits) return error('git: could not load the commit history')
            const commit = findCommit(commits, rest[0] ?? '')
            if (!commit) return error(`fatal: bad revision '${rest[0] ?? ''}'`)
            for (const line of formatGitShow(commit)) push(line.type, line.text, line.html)
            return
          }
          default:
            error(`git: '${sub}' is not a git command. See 'man git'.`)
        }
      }
    },
    fontsize: {
      usage: 'fontsize [0.7–1.6|+|-|reset]',
      description: 'Scale the terminal text (also ctrl+= / ctrl+-)',
      argCandidates: () => ['+', '-', 'reset'],
      exec: (args) => {
        const arg = args[0]
        if (!arg) {
          out(`current scale: ${fontScale.scale.value}× — try 'fontsize 1.2', '+', '-' or 'reset'`)
          return
        }
        if (arg === '+') fontScale.bump(0.1)
        else if (arg === '-') fontScale.bump(-0.1)
        else if (arg === 'reset') fontScale.set(1)
        else {
          const value = Number(arg)
          if (!Number.isFinite(value)) return error(`fontsize: not a number: ${arg}`)
          fontScale.set(value)
        }
        out(`font scale: ${fontScale.scale.value}×`)
      }
    },
    qr: {
      usage: 'qr [text|url]',
      description: 'Turn anything into a scannable QR code',
      examples: ['qr             (encodes the page you are on)', 'qr https://example.com', 'qr any text at all'],
      exec: async (args) => {
        const text = args.join(' ').trim() || (import.meta.client ? window.location.href : '')
        if (!text) return error('qr: nothing to encode')
        // lazy: the encoder only loads when someone asks for a code
        const { qrAsciiLines } = await import('~/utils/qrAscii')
        try {
          push('output', `<pre class="term-qr">${qrAsciiLines(text).join('\n')}</pre>`, true)
          muted(`encodes: ${text.length > 60 ? `${text.slice(0, 57)}...` : text}`)
        } catch {
          error('qr: that is too much data for one code — try something shorter')
        }
      }
    },
    ssh: {
      hidden: true,
      usage: 'ssh <user@host>',
      description: 'Connect to a very real remote server',
      exec: (args) => {
        const target = args[0] ?? ''
        if (!target) {
          error('usage: ssh <user@host> — try ssh guest@laurensverspeek.nl')
          return
        }
        const host = target.includes('@') ? target.split('@')[1]! : target
        if (sshHost.value) return error(`ssh: already connected to ${sshHost.value} — 'exit' first`)
        muted(`Connecting to ${host} (127.0.0.1) port 22 ...`)
        return new Promise<void>((resolve) => {
          setTimeout(() => muted(`Server key fingerprint: SHA256:${'lv'.repeat(3)}...trustme (accepted blindly)`), 350)
          setTimeout(() => out('Authenticated with method "vibes".'), 750)
          setTimeout(() => {
            push('primary', `Welcome to ${host}!`)
            out('  * You were already here, but now it feels more official.')
            out(`  * Last login: just now, from your own browser`)
            muted(`(the prompt now agrees — type 'exit' to disconnect)`)
            sshHost.value = host
            resolve()
          }, 1150)
        })
      }
    },
    sudo: {
      hidden: true,
      description: 'Absolutely not',
      exec: () => error('visitor is not in the sudoers file. This incident will be reported. 😏')
    },
    rm: {
      usage: 'rm <file>',
      description: 'Remove a file or directory',
      argCandidates: hereEntries,
      exec: (args) => {
        const rawName = args.find((arg) => !arg.startsWith('-'))
        // keep the classic joke for the classic mistake (checked pre-expansion)
        if (args.join(' ').includes('-rf') && /^[~/*]/.test(rawName ?? '')) {
          return error('Nice try. I only just finished this website.')
        }
        const names = expandFileArgs(ctx.files.value, ctx.fsCwd.value, args).filter((arg) => !arg.startsWith('-'))
        if (!names.length) return error('rm: missing operand')
        for (const name of names) {
          const path = resolvePath(ctx.fsCwd.value, name)
          if (!path || !(path in ctx.files.value)) {
            error(`rm: cannot remove '${name}': No such file or directory`)
            continue
          }
          // remove the entry and, for a directory, everything under it
          ctx.files.value = Object.fromEntries(
            Object.entries(ctx.files.value).filter(([key]) => key !== path && !key.startsWith(`${path}/`))
          )
          // if we removed the directory we're standing in, walk back to home
          if (ctx.fsCwd.value === path || ctx.fsCwd.value.startsWith(`${path}/`)) ctx.fsCwd.value = ''
        }
      }
    },
    cp: {
      usage: 'cp <source> <dest>',
      description: 'Copy a file',
      argCandidates: hereEntries,
      exec: (args) => copyOrMove('cp', args)
    },
    mv: {
      usage: 'mv <source> <dest>',
      description: 'Move or rename a file',
      argCandidates: hereEntries,
      exec: (args) => copyOrMove('mv', args)
    },
    vim: {
      usage: 'vim <file>',
      description: 'A real modal editor. You can even quit it',
      argCandidates: hereEntries,
      exec: openVim
    },
    vi: {
      hidden: true,
      description: 'Alias for vim',
      argCandidates: hereEntries,
      exec: openVim
    },
    nano: {
      usage: 'nano <file>',
      description: 'Edit a file, the friendly way',
      argCandidates: hereEntries,
      exec: (args) => {
        const name = args[0]
        if (!name) return error('nano: usage: nano <file>')
        const io = editorIo(name)
        if ('error' in io) return error(`nano: ${io.error}`)
        muted(`Editing ${name} — ^S saves, ^X exits.`)
        ctx.startGame((callbacks) => createNanoEditor(io, callbacks))
      }
    }
  }
}
