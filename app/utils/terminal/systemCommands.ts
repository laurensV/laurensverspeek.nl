import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { renderCalendar } from '~/utils/terminal/calendar'
import { parseRedirect } from '~/utils/terminal/filesystem'
import { profile } from '~/data/profile'

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

  return {
    help: {
      description: 'List available commands',
      exec: () => {
        for (const [name, cmd] of Object.entries(ctx.getCommands())) {
          if (cmd.hidden) continue
          push(
            'output',
            `<span class="term-accent">${(cmd.usage ?? name).padEnd(24, ' ')}</span> ${cmd.description}`,
            true
          )
        }
        muted(`\nTip: ↑/↓ history · Tab completes · | grep filters · man <cmd> for details.`)
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
          ctx.files.value = { ...ctx.files.value, [file]: { dir: false, content: text } }
          return
        }
        out(text)
      }
    },
    mkdir: {
      usage: 'mkdir <name>',
      description: 'Create a directory in your home',
      exec: (args) => {
        const name = args[0]
        if (!name) return error('mkdir: missing operand')
        if (ctx.files.value[name]) return error(`mkdir: cannot create '${name}': File exists`)
        ctx.files.value = { ...ctx.files.value, [name]: { dir: true, content: '' } }
      }
    },
    touch: {
      usage: 'touch <name>',
      description: 'Create an empty file in your home',
      exec: (args) => {
        const name = args[0]
        if (!name) return error('touch: missing file operand')
        if (!ctx.files.value[name]) {
          ctx.files.value = { ...ctx.files.value, [name]: { dir: false, content: '' } }
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
    sudo: {
      hidden: true,
      description: 'Absolutely not',
      exec: () => error('visitor is not in the sudoers file. This incident will be reported. 😏')
    },
    rm: {
      usage: 'rm <file>',
      description: 'Remove a file or directory from your home',
      argCandidates: () => Object.keys(ctx.files.value),
      exec: (args) => {
        const name = args.find((arg) => !arg.startsWith('-'))
        // keep the classic joke for the classic mistake
        if (args.join(' ').includes('-rf') && /^[~/*]/.test(name ?? '')) {
          return error('Nice try. I only just finished this website.')
        }
        if (!name) return error('rm: missing operand')
        if (!(name in ctx.files.value)) {
          return error(`rm: cannot remove '${name}': No such file or directory`)
        }
        ctx.files.value = Object.fromEntries(
          Object.entries(ctx.files.value).filter(([key]) => key !== name)
        )
      }
    },
    vim: {
      hidden: true,
      description: 'Trap',
      exec: () => muted(`You are now stuck in vim. Just kidding — this is not a real shell. :q!`)
    }
  }
}
