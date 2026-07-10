import type { TerminalCommand, TerminalContext } from '~/utils/terminal/types'
import { createSnakeGame, createHangmanGame, createTetrisGame, create2048Game, createTopGame, createLifeGame, createWpmGame, createPongGame, createAdventureGame } from '~/utils/terminalGames'

// The terminal mini-games (the game engines live in utils/games/).

export function createGameCommands(ctx: TerminalContext): Record<string, TerminalCommand> {
  const { muted } = ctx

  return {
    snake: {
      category: 'games',
      description: 'Play snake in the terminal',
      exec: () => {
        muted('Starting snake... arrows/wasd to move, q to quit.')
        ctx.startGame(createSnakeGame)
      }
    },
    hangman: {
      category: 'games',
      description: 'Play hangman (a 2014 classic, remastered)',
      exec: () => {
        muted('Starting hangman... type letters to guess, q to quit.')
        ctx.startGame(createHangmanGame)
      }
    },
    tetris: {
      category: 'games',
      description: 'Play tetris in the terminal',
      exec: () => {
        muted('Starting tetris... ←→ move, ↑ rotate, ↓ drop, space slams, q quits.')
        ctx.startGame(createTetrisGame)
      }
    },
    2048: {
      category: 'games',
      description: 'Slide the tiles, double the numbers',
      exec: () => {
        muted('Starting 2048... arrows/wasd to slide, q to quit.')
        ctx.startGame(create2048Game)
      }
    },
    pong: {
      category: 'games',
      description: 'You vs a slightly fallible AI paddle',
      exec: () => {
        muted('Starting pong... w/s or ↑/↓ to move, first to 5, q quits.')
        ctx.startGame(createPongGame)
      }
    },
    wpm: {
      category: 'games',
      description: 'Typing test — how fast are you really?',
      exec: () => {
        muted('Starting typing test... just start typing, Backspace fixes, Esc quits.')
        ctx.startGame(createWpmGame)
      }
    },
    top: {
      category: 'games',
      description: 'Live process monitor',
      exec: () => {
        muted('Starting top... q to quit.')
        ctx.startGame(createTopGame)
      }
    },
    life: {
      category: 'games',
      description: "Conway's Game of Life, in ASCII",
      exec: () => {
        muted('Starting life... space pauses, r reseeds, q quits.')
        ctx.startGame(createLifeGame)
      }
    },
    adventure: {
      category: 'games',
      description: 'A text adventure: the site is the dungeon',
      examples: ['adventure', "then: 'look', 'go west', 'examine keyboard', 'talk duck'"],
      exec: () => {
        muted('Starting adventure... type commands, Esc saves & quits.')
        ctx.startGame(createAdventureGame)
      }
    },
    htop: {
      hidden: true,
      description: 'Alias for top',
      exec: () => ctx.getCommands().top!.exec([])
    }
  }
}
