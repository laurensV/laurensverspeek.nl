import { finalScoreLines, isQuitKey } from '~/utils/terminalGameKit'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

const SNAKE_W = 26
const SNAKE_H = 12
const SNAKE_HIGHSCORE_KEY = 'lv-snake-highscore'

// the ASCII frame is width*2-1 monospace columns (cells joined by spaces): 26
// cells = 51 columns, which overflows a phone's game frame (343px at 375,
// 288px at 320 — a column is ~8.8px at the coarse 0.72rem shrink) and hides
// the right wall mid-game — shrink the board on narrow viewports so the whole
// arena is visible while playing (19 cells = 37 cols ≈ 326px; 16 = 31 ≈ 273px)
const boardWidth = () =>
  typeof window !== 'undefined' && window.innerWidth <= 480
    ? (window.innerWidth <= 350 ? 16 : 19)
    : SNAKE_W

interface Cell {
  x: number
  y: number
}

/** Structured board state, for renderers that draw pixels instead of ASCII
 * (the lvOS desktop app) — the terminal keeps using the onFrame string. */
export interface SnakeState {
  width: number
  height: number
  /** snake[0] is the head */
  snake: Cell[]
  food: Cell
  score: number
}

export function createSnakeGame(
  { onFrame, onEnd }: GameCallbacks,
  onState?: (state: SnakeState) => void
): GameHandle {
  const W = boardWidth()
  const snake: Cell[] = [
    { x: 8, y: 6 },
    { x: 7, y: 6 },
    { x: 6, y: 6 }
  ]
  let dir: Cell = { x: 1, y: 0 }
  let nextDir: Cell = dir
  let food = spawnFood()
  let score = 0

  function spawnFood(): Cell {
    while (true) {
      const candidate = {
        x: 1 + Math.floor(Math.random() * (W - 2)),
        y: 1 + Math.floor(Math.random() * (SNAKE_H - 2))
      }
      if (!snake.some((c) => c.x === candidate.x && c.y === candidate.y)) return candidate
    }
  }

  function tick() {
    dir = nextDir
    const head = { x: snake[0]!.x + dir.x, y: snake[0]!.y + dir.y }
    const hitWall = head.x <= 0 || head.x >= W - 1 || head.y <= 0 || head.y >= SNAKE_H - 1
    // the tail vacates its cell this tick (unless we eat), so following your own
    // tail is legal — exclude the last segment from the self-collision test
    const eating = head.x === food.x && head.y === food.y
    const body = eating ? snake : snake.slice(0, -1)
    const hitSelf = body.some((c) => c.x === head.x && c.y === head.y)
    if (hitWall || hitSelf) {
      end('game over — the snake has encountered a segfault')
      return
    }
    snake.unshift(head)
    if (head.x === food.x && head.y === food.y) {
      score += 10
      food = spawnFood()
    } else {
      snake.pop()
    }
    render()
  }

  function render() {
    const grid: string[][] = Array.from({ length: SNAKE_H }, (_, y) =>
      Array.from({ length: W }, (_, x) => {
        if (y === 0 && x === 0) return '┌'
        if (y === 0 && x === W - 1) return '┐'
        if (y === SNAKE_H - 1 && x === 0) return '└'
        if (y === SNAKE_H - 1 && x === W - 1) return '┘'
        if (y === 0 || y === SNAKE_H - 1) return '─'
        if (x === 0 || x === W - 1) return '│'
        return ' '
      })
    )
    grid[food.y]![food.x] = '●'
    snake.forEach((cell, i) => {
      grid[cell.y]![cell.x] = i === 0 ? '▓' : '█'
    })
    const rows = grid.map((row) => row.join(' ')).join('\n')
    onFrame(`SNAKE  score: ${score}  (arrows/wasd move, q quits)\n\n${rows}`)
    onState?.({
      width: W,
      height: SNAKE_H,
      snake: snake.map((c) => ({ x: c.x, y: c.y })),
      food: { x: food.x, y: food.y },
      score
    })
  }

  function end(message: string) {
    clearInterval(timer)
    onEnd(finalScoreLines(SNAKE_HIGHSCORE_KEY, score, { headline: message }))
  }

  const DIRECTIONS: Record<string, Cell> = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 }
  }

  render()
  const timer = setInterval(tick, 130)

  return {
    onKey(key) {
      const lower = key.toLowerCase()
      if (isQuitKey(key)) {
        end('snake terminated by user')
        return true
      }
      const candidate = DIRECTIONS[lower]
      if (candidate) {
        // no reversing into yourself
        if (candidate.x !== -dir.x || candidate.y !== -dir.y) nextDir = candidate
        return true
      }
      return false
    },
    stop: () => clearInterval(timer)
  }
}
