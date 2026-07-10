import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { effectProcs, SYSTEM_PROCS, killByPid } from '~/utils/terminal/effectProcs'

// Site-wide effects and easter eggs, plus the ps/kill process theater.

export function createEffectCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error, close } = ctx

  // site effects modelled as killable processes for `ps`/`kill` (see effectProcs)
  const procs = effectProcs(ctx.effects)
  const systemProcs = SYSTEM_PROCS

  // how many times someone has asked for the other editor this session
  let insistence = 0

  const commands: Record<string, TerminalCommand> = {
    destroy: {
      hidden: true,
      description: 'Enough talk. Shoot the website.',
      exec: () => {
        muted('Arming ship... click to fire. Esc ends the rampage and repairs the site.')
        ctx.effects.destruct.value = true
        setTimeout(close, 500)
      }
    },
    'barrel-roll': {
      hidden: true,
      description: 'Star Fox taught us well',
      exec: () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          muted('reduced motion is on — please imagine the site doing a 360° 🌀')
          return
        }
        document.documentElement.classList.add('barrel-roll')
        setTimeout(() => document.documentElement.classList.remove('barrel-roll'), 1200)
        out('🌀 weeeeee')
      }
    },
    do: {
      hidden: true,
      usage: 'do a barrel roll',
      description: 'You know what to do',
      exec: (args) => {
        if (args.join(' ').toLowerCase() === 'a barrel roll') {
          void commands['barrel-roll']!.exec([])
          return
        }
        error(`do: I only know one trick. It involves a barrel.`)
      }
    },
    ps: {
      category: 'system',
      description: 'List running processes (effects included)',
      exec: () => {
        push('output', `<span class="term-accent">${'PID'.padStart(5)}  ${'STAT'.padEnd(5)}COMMAND</span>`, true)
        for (const proc of systemProcs) {
          out(`${String(proc.pid).padStart(5)}  S    ${proc.name}`)
        }
        const running = procs.filter((proc) => proc.running())
        for (const proc of running) {
          out(`${String(proc.pid).padStart(5)}  R    ${proc.name}`)
        }
        if (!running.length) muted(`\nno effects running — start one with 'matrix', 'party', 'sl' or 'crt'.`)
        else muted(`\nStop an effect with 'kill <pid>'.`)
      }
    },
    kill: {
      category: 'system',
      usage: 'kill <pid>',
      description: 'Stop a process. Yes, kill 314 really stops the rain',
      argCandidates: () => procs.filter((proc) => proc.running()).map((proc) => String(proc.pid)),
      exec: (args) => {
        const pid = Number(args.find((arg) => !arg.startsWith('-')))
        if (!pid) return error('kill: usage: kill <pid> — see ps for the candidates')
        const result = killByPid(procs, systemProcs, pid)
        if (result.ok) return out(`[${pid}] ${result.name} terminated`)
        if (result.reason === 'not-running') return error(`kill: (${pid}) — no such process (it isn't running)`)
        if (result.reason === 'not-permitted') return error(`kill: (${pid}) — operation not permitted. this site needs that.`)
        error(`kill: (${pid}) — no such process`)
      }
    },
    emacs: {
      hidden: true,
      description: 'The other editor (results may vary)',
      exec: (args) => {
        insistence++
        if (args.join(' ').includes('--force')) {
          error('emacs: --force is not a chord. this proves nothing.')
          return
        }
        if (insistence === 1) {
          error('emacs: command not found (and the house is at peace)')
          muted(`this site runs vim. it's real, too — try 'vim notes.txt'.`)
          return
        }
        if (insistence === 2) {
          error('emacs: still not found. persistence noted and respected.')
          muted('(vim is right there. it has :wq and everything.)')
          return
        }
        insistence = 0
        muted('fine. simulating emacs:')
        out('loading emacs... [##--------------------] 9%')
        out('loading emacs... [####------------------] 17%')
        out('estimated completion: heat death of the universe')
        error('emacs: out of memory (8 megabytes and constantly swapping)')
        muted(`M-x doctor says: try 'vim'.`)
      }
    },
    matrix: {
      category: 'toys',
      description: 'There is no spoon',
      exec: () => {
        push('primary', 'Wake up, Neo...')
        muted('The Matrix has you. Click or press any key to escape.')
        setTimeout(() => {
          ctx.effects.matrix.value = true
          ctx.isOpen.value = false
        }, 900)
      }
    },
    crt: {
      category: 'toys',
      description: 'Toggle retro CRT mode',
      exec: () => {
        const on = ctx.effects.toggleCrt()
        out(on ? 'CRT mode enabled. Welcome back to 1985.' : 'CRT mode disabled. Back to the future.')
      }
    },
    sl: {
      hidden: true,
      description: 'You meant ls. Enjoy the ride.',
      exec: () => {
        muted(`You typed 'sl' instead of 'ls', didn't you? Enjoy the ride.`)
        ctx.effects.train.value = true
        setTimeout(close, 600)
      }
    },
    party: {
      hidden: true,
      description: 'As if you typed the Konami code',
      exec: () => {
        out('🎉 cheat mode activated')
        muted('(the classy way in: ↑↑↓↓←→←→BA)')
        ctx.effects.party.value = true
        setTimeout(close, 400)
      }
    },
    desktop: {
      description: 'Boot the lvOS desktop environment',
      exec: () => {
        push('primary', 'Booting lvOS 2.0 ...')
        muted('Tip: Esc or the start menu logs you out again.')
        ctx.navigate('desktop')
      }
    },
    startx: {
      hidden: true,
      description: 'Alias for desktop',
      exec: () => ctx.getCommands().desktop!.exec([])
    }
  }

  return commands
}
