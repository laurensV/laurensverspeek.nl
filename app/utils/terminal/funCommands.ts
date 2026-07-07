import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createSnakeGame, createHangmanGame, createTetrisGame, create2048Game, createTopGame } from '~/utils/terminalGames'
import { profile } from '~/data/profile'
import { cowsay, fortune, figlet } from '~/utils/terminalToys'

// Toys, games, site-wide effects and easter eggs.

export function createFunCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { push, out, muted, error, close } = ctx

  const commands: Record<string, TerminalCommand> = {
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
    snake: {
      description: 'Play snake in the terminal',
      exec: () => {
        muted('Starting snake... arrows/wasd to move, q to quit.')
        ctx.startGame(createSnakeGame)
      }
    },
    hangman: {
      description: 'Play hangman (a 2014 classic, remastered)',
      exec: () => {
        muted('Starting hangman... type letters to guess, q to quit.')
        ctx.startGame(createHangmanGame)
      }
    },
    tetris: {
      description: 'Play tetris in the terminal',
      exec: () => {
        muted('Starting tetris... ←→ move, ↑ rotate, ↓ drop, space slams, q quits.')
        ctx.startGame(createTetrisGame)
      }
    },
    2048: {
      description: 'Slide the tiles, double the numbers',
      exec: () => {
        muted('Starting 2048... arrows/wasd to slide, q to quit.')
        ctx.startGame(create2048Game)
      }
    },
    top: {
      description: 'Live process monitor',
      exec: () => {
        muted('Starting top... q to quit.')
        ctx.startGame(createTopGame)
      }
    },
    htop: {
      hidden: true,
      description: 'Alias for top',
      exec: () => ctx.getCommands().top!.exec([])
    },
    ping: {
      usage: 'ping <host>',
      description: 'Send ICMP packets to a host',
      exec: (args) => {
        const host = args[0] ?? profile.domain
        muted(`PING ${host} (127.0.0.1): 56 data bytes`)
        let seq = 0
        const times: number[] = []
        const send = () => {
          if (seq >= 4) {
            const min = Math.min(...times).toFixed(1)
            const max = Math.max(...times).toFixed(1)
            const avg = (times.reduce((s, t) => s + t, 0) / times.length).toFixed(1)
            out('')
            out(`--- ${host} ping statistics ---`)
            out(`4 packets transmitted, 4 received, 0% packet loss`)
            out(`round-trip min/avg/max = ${min}/${avg}/${max} ms`)
            return
          }
          const time = 8 + Math.random() * 30
          times.push(time)
          out(`64 bytes from ${host}: icmp_seq=${seq} ttl=64 time=${time.toFixed(1)} ms`)
          seq++
          setTimeout(send, 420)
        }
        send()
      }
    },
    curl: {
      usage: 'curl <url>',
      description: 'Transfer data from a URL (well, pretend to)',
      exec: (args) => {
        const url = args[0]
        if (!url) {
          error('curl: try \'curl laurensverspeek.nl\'')
          return
        }
        muted(`* Trying ${url}...`)
        setTimeout(() => muted('* Connected — TLS handshake OK'), 250)
        setTimeout(() => {
          push('primary', 'HTTP/2 200')
          out('content-type: text/html; charset=utf-8')
          out('server: nitro')
          out('x-powered-by: caffeine & curiosity')
          out('')
          out('<!doctype html><title>Laurens Verspeek</title>')
          out('<!-- psst: the real fun is behind the ~ key -->')
        }, 550)
      }
    },
    desktop: {
      description: 'Boot the lvOS desktop environment',
      exec: () => {
        push('primary', 'Booting lvOS 2.0 ...')
        muted('Tip: Esc or the start menu logs you out again.')
        setTimeout(() => {
          ctx.effects.desktop.value = true
          ctx.isOpen.value = false
        }, 700)
      }
    },
    startx: {
      hidden: true,
      description: 'Alias for desktop',
      exec: () => ctx.getCommands().desktop!.exec([])
    },
    matrix: {
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
    }
  }

  return commands
}
