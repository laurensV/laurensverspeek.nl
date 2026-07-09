import { finalScoreLines, createTicker, isQuitKey } from '~/utils/terminalGameKit'
import type { GameHandle, GameCallbacks } from '~/utils/games/types'

const TETRIS_W = 10
const TETRIS_H = 16
const TETRIS_HIGHSCORE_KEY = 'lv-tetris-highscore'

type Matrix = number[][]

const TETROMINOES: Record<string, Matrix> = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[1, 1, 1], [0, 1, 0]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
}

const rotateCW = (shape: Matrix): Matrix =>
  shape[0]!.map((_, x) => shape.map((row) => row[x]!).reverse())

export function createTetrisGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  const board: Matrix = Array.from({ length: TETRIS_H }, () => Array(TETRIS_W).fill(0))
  let score = 0
  let clearedTotal = 0
  let over = false

  const randomPiece = () => {
    const names = Object.keys(TETROMINOES)
    const name = names[Math.floor(Math.random() * names.length)]!
    return { name, shape: TETROMINOES[name]! }
  }

  let current = randomPiece()
  let next = randomPiece()
  let px = Math.floor((TETRIS_W - current.shape[0]!.length) / 2)
  let py = 0

  const collides = (shape: Matrix, x: number, y: number) =>
    shape.some((row, dy) =>
      row.some((cell, dx) => {
        if (!cell) return false
        const bx = x + dx
        const by = y + dy
        return bx < 0 || bx >= TETRIS_W || by >= TETRIS_H || (by >= 0 && board[by]![bx])
      })
    )

  const spawn = () => {
    current = next
    next = randomPiece()
    px = Math.floor((TETRIS_W - current.shape[0]!.length) / 2)
    py = 0
    if (collides(current.shape, px, py)) {
      end('game over — the stack reached the top of the heap')
    }
  }

  const lock = () => {
    current.shape.forEach((row, dy) =>
      row.forEach((cell, dx) => {
        if (cell && py + dy >= 0) board[py + dy]![px + dx] = 1
      })
    )
    const remaining = board.filter((row) => row.some((cell) => !cell))
    const cleared = TETRIS_H - remaining.length
    if (cleared) {
      clearedTotal += cleared
      score += [0, 100, 300, 500, 800][cleared] ?? 800
      while (remaining.length < TETRIS_H) remaining.unshift(Array(TETRIS_W).fill(0))
      board.splice(0, TETRIS_H, ...remaining)
    }
    spawn()
  }

  const move = (dx: number) => {
    if (!collides(current.shape, px + dx, py)) px += dx
  }

  const rotate = () => {
    const rotated = rotateCW(current.shape)
    // simple wall kicks: try in place, then one step left/right
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(rotated, px + kick, py)) {
        current = { ...current, shape: rotated }
        px += kick
        return
      }
    }
  }

  const softDrop = () => {
    if (!collides(current.shape, px, py + 1)) py++
    else lock()
  }

  const hardDrop = () => {
    while (!collides(current.shape, px, py + 1)) py++
    lock()
  }

  function render() {
    if (over) return
    const grid = board.map((row) => [...row])
    current.shape.forEach((row, dy) =>
      row.forEach((cell, dx) => {
        if (cell && py + dy >= 0) grid[py + dy]![px + dx] = 2
      })
    )
    const rows = grid
      .map((row) => `│${row.map((cell) => (cell ? '██' : '  ')).join('')}│`)
      .join('\n')
    onFrame(
      `TETRIS  score: ${score}  lines: ${clearedTotal}  next: ${next.name}\n`
      + `(←→ move, ↑ rotate, ↓ drop, space slam, q quits)\n\n${rows}\n└${'──'.repeat(TETRIS_W)}┘`
    )
  }

  function end(message: string) {
    over = true
    ticker.stop()
    onEnd(finalScoreLines(TETRIS_HIGHSCORE_KEY, score, {
      headline: message,
      scoreLabel: `final score: ${score} (${clearedTotal} lines)`
    }))
  }

  render()
  // gravity gets faster as lines clear, so the interval is recomputed each tick
  const ticker = createTicker(
    () => {
      softDrop()
      render()
    },
    () => Math.max(160, 450 - clearedTotal * 10)
  )
  ticker.start()

  return {
    onKey(key) {
      if (over) return false
      const lower = key.toLowerCase()
      if (isQuitKey(key)) {
        end('tetris terminated by user')
        return true
      }
      const actions: Record<string, () => void> = {
        arrowleft: () => move(-1),
        a: () => move(-1),
        arrowright: () => move(1),
        d: () => move(1),
        arrowup: rotate,
        w: rotate,
        arrowdown: softDrop,
        s: softDrop,
        ' ': hardDrop
      }
      const action = actions[lower]
      if (!action) return false
      action()
      render()
      return true
    },
    stop: () => ticker.stop()
  }
}
