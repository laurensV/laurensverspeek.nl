import { finalScoreLines, isQuitKey } from '~/utils/terminalGameKit'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

const SNAKE_W = 26
const SNAKE_H = 12
const SNAKE_HIGHSCORE_KEY = 'lv-snake-highscore'

interface Cell {
  x: number
  y: number
}

export function createSnakeGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
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
        x: 1 + Math.floor(Math.random() * (SNAKE_W - 2)),
        y: 1 + Math.floor(Math.random() * (SNAKE_H - 2))
      }
      if (!snake?.some((c) => c.x === candidate.x && c.y === candidate.y)) return candidate
    }
  }

  function tick() {
    dir = nextDir
    const head = { x: snake[0]!.x + dir.x, y: snake[0]!.y + dir.y }
    const hitWall = head.x <= 0 || head.x >= SNAKE_W - 1 || head.y <= 0 || head.y >= SNAKE_H - 1
    const hitSelf = snake.some((c) => c.x === head.x && c.y === head.y)
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
      Array.from({ length: SNAKE_W }, (_, x) => {
        if (y === 0 && x === 0) return '┌'
        if (y === 0 && x === SNAKE_W - 1) return '┐'
        if (y === SNAKE_H - 1 && x === 0) return '└'
        if (y === SNAKE_H - 1 && x === SNAKE_W - 1) return '┘'
        if (y === 0 || y === SNAKE_H - 1) return '─'
        if (x === 0 || x === SNAKE_W - 1) return '│'
        return ' '
      })
    )
    grid[food.y]![food.x] = '●'
    snake.forEach((cell, i) => {
      grid[cell.y]![cell.x] = i === 0 ? '▓' : '█'
    })
    const rows = grid.map((row) => row.join(' ')).join('\n')
    onFrame(`SNAKE  score: ${score}  (arrows/wasd move, q quits)\n\n${rows}`)
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
