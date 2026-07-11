import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { LVSH_PID, LVOS_SESSION_PID, killByPid } from '~/utils/terminal/effectProcs'

// Site-wide effects and easter eggs, plus the ps/kill process theater.

export function createEffectCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error, close } = ctx

  // one process table across the whole site (shared with top and the lvOS
  // task manager — factory-time capture, exec runs outside the Nuxt instance)
  const table = useProcessTable({ effects: ctx.effects, game: ctx.game, closeShell: close })
  const allProcs = table.all
  const systemProcs = table.system

  // how many times someone has asked for the other editor this session
  let insistence = 0

  // the pixel world speaks terminal (composable captured at factory time)
  const world = useWorld()

  const commands: Record<string, TerminalCommand> = {
    world: {
      hidden: true,
      usage: 'world [open|status|goto <x> <y>]',
      description: 'The hidden shared pixel canvas',
      argCandidates: () => ['open', 'status', 'goto'],
      exec: (args) => {
        const [sub, xRaw, yRaw] = args
        if (!sub || sub === 'open') {
          muted('entering the pixel world ...')
          ctx.navigate('world')
          return
        }
        if (sub === 'status') {
          if (world.connected.value) {
            out(`world: online — ${world.online.value} here now, ${world.recent.value} pixels in the last 10 minutes`)
          } else {
            out('world: offline mode — pixels stay in this browser until a relay is configured')
          }
          muted(`board: 128×128 · cooldown ${Math.round(world.cooldownMs.value / 1000)}s · 'world goto <x> <y>' jumps the camera`)
          return
        }
        if (sub === 'goto') {
          const x = Number(xRaw)
          const y = Number(yRaw)
          if (!Number.isInteger(x) || !Number.isInteger(y)) return error('world: usage: world goto <x> <y>')
          world.gotoTarget.value = { x, y }
          muted(`camera set to (${x}, ${y}) — opening the world ...`)
          ctx.navigate('world')
          return
        }
        error(`world: unknown subcommand '${sub}' — try open, status or goto`)
      }
    },
    pixel: {
      hidden: true,
      usage: 'pixel place <x> <y> <color 0-15>',
      description: 'Place one pixel in the world, from right here',
      exec: (args) => {
        const [sub, xRaw, yRaw, cRaw] = args
        if (sub !== 'place') return error('pixel: usage: pixel place <x> <y> <color 0-15>')
        const x = Number(xRaw)
        const y = Number(yRaw)
        const c = Number(cRaw)
        world.enter() // make sure the board exists (online or offline)
        const wait = world.place(x, y, c)
        if (wait === -1) return error('pixel: out of bounds or bad color — the board is 128×128, colors 0-15')
        if (wait > 0) return error(`pixel: cooldown — try again in ${Math.ceil(wait / 1000)}s`)
        out(`placed (${x}, ${y}) in color ${c} ${world.connected.value ? '— the world saw it' : '— offline, saved locally'}`)
        muted(`'world goto ${x} ${y}' takes you there`)
      }
    },
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
      description: 'List running processes (effects, lvOS windows, games)',
      exec: () => {
        push('output', `<span class="term-accent">${'PID'.padStart(5)}  ${'STAT'.padEnd(5)}COMMAND</span>`, true)
        for (const proc of systemProcs) {
          out(`${String(proc.pid).padStart(5)}  S    ${proc.name}`)
        }
        const running = allProcs()
          .filter((proc) => proc.running())
          .sort((a, b) => a.pid - b.pid)
        for (const proc of running) {
          out(`${String(proc.pid).padStart(5)}  R    ${proc.name}`)
        }
        muted(`\nStop anything with 'kill <pid>' — lvOS windows and effects really close.`)
      }
    },
    kill: {
      category: 'system',
      usage: 'kill <pid>',
      description: 'Stop a process — an effect, an lvOS window, even the shell',
      argCandidates: () => allProcs().filter((proc) => proc.running()).map((proc) => String(proc.pid)),
      exec: (args) => {
        const pid = Number(args.find((arg) => !arg.startsWith('-')))
        if (!pid) return error('kill: usage: kill <pid> — see ps for the candidates')
        if (pid === LVSH_PID) muted('kill: terminating your own shell. bold. goodbye.')
        if (pid === LVOS_SESSION_PID) muted('kill: ending the lvOS session — logging out.')
        const result = killByPid(allProcs(), systemProcs, pid)
        if (result.ok) return out(`[${pid}] ${result.name} terminated`)
        if (result.reason === 'not-running') return error(`kill: (${pid}) — no such process (it isn't running)`)
        if (result.reason === 'not-permitted') return error(`kill: (${pid}) — operation not permitted. this site needs that.`)
        error(`kill: (${pid}) — no such process`)
      }
    },
    boss: {
      hidden: true,
      description: 'Quick! The boss! (Esc when the coast is clear)',
      exec: () => {
        muted('deploying plausible spreadsheet...')
        ctx.effects.boss.value = true
        setTimeout(close, 200)
      }
    },
    fireworks: {
      hidden: true,
      description: 'Light up the night sky (pid 1231 if you regret it)',
      exec: () => {
        // reduced motion gets a handcrafted burst instead of the canvas show
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          out(String.raw`       .  *  .`)
          out(String.raw`    *  \ | /  *`)
          out(String.raw`   .  ~ -o- ~  .`)
          out(String.raw`    *  / | \  *`)
          out(String.raw`       '  *  '`)
          muted('(reduced motion is on — one artisanal firework, hold the motion)')
          return
        }
        muted('lighting fuses... Esc (or kill 1231) ends the show.')
        ctx.effects.fireworks.value = true
        setTimeout(close, 400)
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
        muted('Tip: the start menu logs you out again.')
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
