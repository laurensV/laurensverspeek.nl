import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { groupCommands, relatedCommands } from '~/utils/terminal/helpGroups'
import { resolvePath, pathCandidates } from '~/utils/terminal/filesystem'

// Shell housekeeping: help, aliases, environment, history, panes and scripts.

export function createShellCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error } = ctx

  // set by the ssh easter egg (miscCommands); exit disconnects it first
  const sshHost = useState(STATE_KEYS.terminalSshHost, () => '')

  return {
    help: {
      category: 'system',
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
      category: 'system',
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
        const related = relatedCommands(name, ctx.getCommands())
        if (related.length) {
          push('primary', 'SEE ALSO')
          muted(`    ${related.map((other) => `${other}(1)`).join(', ')}`)
        }
      }
    },
    alias: {
      category: 'system',
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
      category: 'system',
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
      category: 'system',
      description: 'List environment variables',
      exec: () => {
        for (const [key, value] of Object.entries(ctx.env.value)) {
          push('output', `<span class="term-accent">${key}</span>=${value}`, true)
        }
      }
    },
    export: {
      category: 'system',
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
    which: {
      category: 'system',
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
      category: 'system',
      description: 'Show command history',
      exec: () =>
        ctx.history.value.forEach((cmd, i) => out(`${String(i + 1).padStart(3, ' ')}  ${cmd}`))
    },
    clear: {
      category: 'system',
      description: 'Clear the terminal',
      exec: () => {
        ctx.panes.clearActive()
      }
    },
    tmux: {
      category: 'system',
      usage: 'tmux [split -h|-v]',
      description: 'Terminal multiplexer — split into panes',
      examples: ['tmux  (splits side by side)', 'tmux split -v  (stacked)', 'prefix key: ctrl+b — then % or " splits, arrows/o move, x closes'],
      exec: (args) => {
        const dir = args.includes('-v') ? 'rows' as const : 'cols' as const
        if (!ctx.panes.split(dir)) {
          error(`tmux: this window maxes out at 4 panes — close one with ctrl+b x`)
          return
        }
        muted(`(pane ${ctx.panes.count()} of 4 — ctrl+b then % or " splits, arrows move, x closes)`)
      }
    },
    sh: {
      category: 'system',
      usage: 'sh <script>',
      description: 'Run a shell script from your filesystem',
      examples: [
        `echo 'figlet hi' > hello.sh   (write the script first)`,
        `echo 'fortune' >> hello.sh    (>> appends more lines)`,
        'sh hello.sh                   (runs it line by line; # comments and && work)'
      ],
      argCandidates: (partial) => pathCandidates(ctx.files.value, ctx.fsCwd.value, partial),
      exec: (args) => {
        const name = args[0]
        if (!name) return error('sh: usage: sh <script> — write one with echo and >')
        const path = resolvePath(ctx.fsCwd.value, name)
        const node = ctx.files.value[path]
        if (!node) return error(`sh: ${name}: No such file or directory`)
        if (node.dir) return error(`sh: ${name}: Is a directory`)
        const scriptLines = node.content.split('\n')
        if (!scriptLines.some((line) => line.trim() && !line.trim().startsWith('#'))) {
          return muted(`sh: ${name}: nothing to run (comments and empty lines only)`)
        }
        return ctx.runScript(scriptLines)
      }
    },
    exit: {
      category: 'system',
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
    }
  }
}
