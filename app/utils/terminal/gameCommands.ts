import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createSnakeGame, createHangmanGame, createTetrisGame, create2048Game, createTopGame, createLifeGame, createWpmGame, createPongGame, createAdventureGame } from '~/utils/terminalGames'

// The terminal mini-games (the game engines live in utils/games/).

export function createGameCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { muted } = ctx

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
        ctx.startGame(createSnakeGame, 'snake')
      }
    },
    hangman: {
      category: 'games',
      description: 'Play hangman (a 2014 classic, remastered)',
      exec: () => {
        muted('Starting hangman... type letters to guess, q to quit.')
        ctx.startGame(createHangmanGame, 'hangman')
      }
    },
    tetris: {
      category: 'games',
      description: 'Play tetris in the terminal',
      exec: () => {
        muted('Starting tetris... ←→ move, ↑ rotate, ↓ drop, space slams, q quits.')
        ctx.startGame(createTetrisGame, 'tetris')
      }
    },
    2048: {
      category: 'games',
      description: 'Slide the tiles, double the numbers',
      exec: () => {
        muted('Starting 2048... arrows/wasd to slide, q to quit.')
        ctx.startGame(create2048Game, '2048')
      }
    },
    pong: {
      category: 'games',
      description: 'You vs a slightly fallible AI paddle',
      exec: () => {
        muted('Starting pong... w/s or ↑/↓ to move, first to 5, q quits.')
        ctx.startGame(createPongGame, 'pong')
      }
    },
    wpm: {
      category: 'games',
      description: 'Typing test — how fast are you really?',
      exec: () => {
        muted('Starting typing test... just start typing, Backspace fixes, Esc quits.')
        ctx.startGame(createWpmGame, 'wpm')
      }
    },
    top: {
      category: 'games',
      description: 'Live process monitor',
      exec: () => {
        muted('Starting top... q to quit.')
        ctx.startGame((callbacks) => createTopGame(callbacks, topProcs), 'top')
      }
    },
    life: {
      category: 'games',
      description: "Conway's Game of Life, in ASCII",
      exec: () => {
        muted('Starting life... space pauses, r reseeds, q quits.')
        ctx.startGame(createLifeGame, 'life')
      }
    },
    adventure: {
      category: 'games',
      description: 'A text adventure: the site is the dungeon',
      examples: ['adventure', "then: 'look', 'go west', 'examine keyboard', 'talk duck'"],
      exec: () => {
        muted('Starting adventure... type commands, Esc saves & quits.')
        ctx.startGame(createAdventureGame, 'adventure')
      }
    },
    htop: {
      hidden: true,
      description: 'Alias for top',
      exec: () => ctx.getCommands().top!.exec([])
    }
  }
}
