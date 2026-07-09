// Barrel for the terminal mini-games. Each game lives in its own module under
// utils/games/; this keeps the historical `~/utils/terminalGames` import path
// (used by the terminal, lvOS apps and tests) working after the split.

export type { GameHandle, GameCallbacks } from '~/utils/games/types'
export { createSnakeGame } from '~/utils/games/snake'
export { createTetrisGame } from '~/utils/games/tetris'
export { create2048Game } from '~/utils/games/game2048'
export { createTopGame } from '~/utils/games/top'
export { createHangmanGame } from '~/utils/games/hangman'
export { createLifeGame } from '~/utils/games/life'
export { createWpmGame, wpmStats } from '~/utils/games/wpm'
export { createPongGame } from '~/utils/games/pong'
export { createStarwarsGame } from '~/utils/games/starwars'
