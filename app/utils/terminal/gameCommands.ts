import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { WINDOW_TITLES } from '~/utils/desktopApps'

// The terminal mini-games (the game engines live in utils/games/). Every
// engine is imported dynamically at launch so none of them ride along in the
// main bundle — a visitor pays for tetris when they type `tetris`, not on
// first paint.

export function createGameCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { muted } = ctx

  // captured at factory time (exec handlers run outside the Nuxt context):
  // online pong needs the relay url and the visitor's display name
  const cursorsWs = useRuntimeConfig().public.cursorsWs
  const { name: identityName } = useIdentity()
  // the chess command opens the lvOS app when the desktop is up
  const route = useRoute()
  const windowManager = useWindowManager(WINDOW_TITLES)

  // top renders the same unified process table as ps and the lvOS task
  // manager: system daemons plus whatever is really running right now
  const table = useProcessTable({ effects: ctx.effects, game: ctx.game, closeShell: ctx.close })
  const topProcs = () => [
    ...table.system.map((proc) => ({ pid: proc.pid, cmd: proc.name, system: true })),
    ...table.running().map((proc) => ({ pid: proc.pid, cmd: proc.name, system: false }))
  ]

  return {
    snake: {
      category: 'games',
      description: 'Play snake in the terminal',
      exec: () => {
        muted('Starting snake... arrows/wasd to move, q to quit.')
        return import('~/utils/games/snake').then(({ createSnakeGame }) => ctx.startGame(createSnakeGame, 'snake'))
      }
    },
    hangman: {
      category: 'games',
      description: 'Play hangman (a 2014 classic, remastered)',
      exec: () => {
        muted('Starting hangman... type letters to guess, q to quit.')
        return import('~/utils/games/hangman').then(({ createHangmanGame }) => ctx.startGame(createHangmanGame, 'hangman'))
      }
    },
    tetris: {
      category: 'games',
      description: 'Play tetris in the terminal',
      exec: () => {
        muted('Starting tetris... ←→ move, ↑ rotate, ↓ drop, space slams, q quits.')
        return import('~/utils/games/tetris').then(({ createTetrisGame }) => ctx.startGame(createTetrisGame, 'tetris'))
      }
    },
    2048: {
      category: 'games',
      description: 'Slide the tiles, double the numbers',
      exec: () => {
        muted('Starting 2048... arrows/wasd to slide, q to quit.')
        return import('~/utils/games/game2048').then(({ create2048Game }) => ctx.startGame(create2048Game, '2048'))
      }
    },
    pong: {
      category: 'games',
      usage: 'pong [online]',
      description: 'You vs the AI — or `pong online` vs another live visitor',
      examples: ['pong', 'pong online'],
      argCandidates: () => ['online'],
      exec: (args) => {
        if (args[0]?.toLowerCase() === 'online') {
          if (!cursorsWs) {
            muted('pong online needs the live relay — no relay on this build.')
            muted('The house AI steps in instead. w/s or ↑/↓ to move, q quits.')
            return import('~/utils/games/pong').then(({ createPongGame }) => ctx.startGame(createPongGame, 'pong'))
          }
          muted('Entering the arcade... first other visitor to type `pong online` is your opponent. q backs out.')
          return import('~/utils/games/pongOnline').then(({ createOnlinePong }) =>
            ctx.startGame((callbacks) => createOnlinePong({ wsUrl: cursorsWs, playerName: identityName.value }, callbacks), 'pong online'))
        }
        muted('Starting pong... w/s or ↑/↓ to move, first to 5, q quits.')
        return import('~/utils/games/pong').then(({ createPongGame }) => ctx.startGame(createPongGame, 'pong'))
      }
    },
    chess: {
      category: 'games',
      description: 'Chess vs the house AI — or a live visitor (lvOS app)',
      exec: () => {
        if (route.path === '/desktop') {
          windowManager.openWindow('chess')
          ctx.out('opening the board — the ⚔ button challenges a live visitor.')
          return
        }
        muted('chess lives on the lvOS desktop — run `desktop`, then alt+r → chess.')
        muted(cursorsWs
          ? 'the ⚔ button in the app challenges another live visitor; the relay referees.'
          : 'this build has no relay, so it\'s you vs the house AI.')
      }
    },
    wpm: {
      category: 'games',
      description: 'Typing test — how fast are you really?',
      exec: () => {
        muted('Starting typing test... just start typing, Backspace fixes, Esc quits.')
        return import('~/utils/games/wpm').then(({ createWpmGame }) => ctx.startGame(createWpmGame, 'wpm'))
      }
    },
    top: {
      category: 'games',
      description: 'Live process monitor',
      exec: () => {
        muted('Starting top... q to quit.')
        return import('~/utils/games/top').then(({ createTopGame }) =>
          ctx.startGame((callbacks) => createTopGame(callbacks, topProcs), 'top'))
      }
    },
    asciiquarium: {
      category: 'toys',
      description: 'A tiny ASCII fish tank swims in your terminal',
      exec: () => {
        muted('Filling the tank... q to surface.')
        return import('~/utils/games/asciiquarium').then(({ createAquarium }) => ctx.startGame(createAquarium, 'asciiquarium'))
      }
    },
    life: {
      category: 'games',
      description: "Conway's Game of Life, in ASCII",
      exec: () => {
        muted('Starting life... space pauses, r reseeds, q quits.')
        return import('~/utils/games/life').then(({ createLifeGame }) => ctx.startGame(createLifeGame, 'life'))
      }
    },
    adventure: {
      category: 'games',
      description: 'A text adventure: the site is the dungeon',
      examples: ['adventure', "then: 'look', 'go west', 'examine keyboard', 'talk duck'"],
      exec: () => {
        muted('Starting adventure... type commands, Esc saves & quits.')
        return import('~/utils/games/adventure').then(({ createAdventureGame }) => ctx.startGame(createAdventureGame, 'adventure'))
      }
    },
    htop: {
      hidden: true,
      description: 'Alias for top',
      exec: () => ctx.getCommands().top!.exec([])
    }
  }
}
