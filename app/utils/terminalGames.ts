// Mini-games playable inside the terminal overlay.
// A game receives callbacks to draw frames and report its final output lines;
// the terminal routes keystrokes to the active game via `onKey`.
// Shared boilerplate (high scores, tick timers, quit keys) lives in terminalGameKit.

import { finalScoreLines, createTicker, isQuitKey } from '~/utils/terminalGameKit'

export interface GameHandle {
  /** Handle a keydown key; return true when the key was consumed */
  onKey(key: string): boolean
  /** Stop timers etc. (called when the terminal closes mid-game) */
  stop(): void
}

export interface GameCallbacks {
  onFrame(frame: string): void
  onEnd(lines: string[]): void
}

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

const HANGMAN_WORDS = [
  'blockchain',
  'typescript',
  'decentralized',
  'amsterdam',
  'genetic',
  'solana',
  'terminal',
  'inference',
  'validator',
  'keyboard',
  'nosana'
]

const GALLOWS = [
  ['  ┌───┐', '  │   ', '  │', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │   │', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │  /│', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │  /│\\', '  │', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │  /│\\', '  │  /', '  │', '──┴──'],
  ['  ┌───┐', '  │   O', '  │  /│\\', '  │  / \\', '  │', '──┴──']
]

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

const G2048_HIGHSCORE_KEY = 'lv-2048-highscore'

export function create2048Game({ onFrame, onEnd }: GameCallbacks): GameHandle {
  let grid: Matrix = Array.from({ length: 4 }, () => Array(4).fill(0))
  let score = 0
  let reached2048 = false

  const addTile = () => {
    const empty: [number, number][] = []
    grid.forEach((row, y) => row.forEach((cell, x) => !cell && empty.push([y, x])))
    if (!empty.length) return
    const [y, x] = empty[Math.floor(Math.random() * empty.length)]!
    grid[y]![x] = Math.random() < 0.9 ? 2 : 4
  }

  /** Slide + merge one row to the left; returns the new row. */
  const slideRow = (row: number[]): number[] => {
    const tiles = row.filter(Boolean)
    const merged: number[] = []
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === tiles[i + 1]) {
        const value = tiles[i]! * 2
        score += value
        if (value === 2048) reached2048 = true
        merged.push(value)
        i++
      } else {
        merged.push(tiles[i]!)
      }
    }
    while (merged.length < 4) merged.push(0)
    return merged
  }

  const transpose = (m: Matrix): Matrix => m[0]!.map((_, x) => m.map((row) => row[x]!))
  const mirror = (m: Matrix): Matrix => m.map((row) => [...row].reverse())

  const slide = (direction: 'left' | 'right' | 'up' | 'down'): boolean => {
    const before = JSON.stringify(grid)
    if (direction === 'left') grid = grid.map(slideRow)
    if (direction === 'right') grid = mirror(mirror(grid).map(slideRow))
    if (direction === 'up') grid = transpose(transpose(grid).map(slideRow))
    if (direction === 'down') grid = transpose(mirror(mirror(transpose(grid)).map(slideRow)))
    return JSON.stringify(grid) !== before
  }

  const canMove = () =>
    grid.some((row, y) =>
      row.some(
        (cell, x) => !cell || cell === grid[y]?.[x + 1] || cell === grid[y + 1]?.[x]
      )
    )

  function render(message = '') {
    const line = (l: string, m: string, r: string) => `${l}${Array(4).fill('──────').join(m)}${r}`
    const rows = grid
      .map((row) => `│${row.map((cell) => (cell ? String(cell).padStart(5, ' ') + ' ' : '      ')).join('│')}│`)
      .join(`\n${line('├', '┼', '┤')}\n`)
    onFrame(
      `2048  score: ${score}${reached2048 ? '  🏆' : ''}  (arrows/wasd, q quits)\n\n`
      + `${line('┌', '┬', '┐')}\n${rows}\n${line('└', '┴', '┘')}\n${message}`
    )
  }

  function end(message: string) {
    onEnd(finalScoreLines(G2048_HIGHSCORE_KEY, score, { headline: message }))
  }

  addTile()
  addTile()
  render()

  const DIRECTIONS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
    arrowleft: 'left',
    a: 'left',
    arrowright: 'right',
    d: 'right',
    arrowup: 'up',
    w: 'up',
    arrowdown: 'down',
    s: 'down'
  }

  return {
    onKey(key) {
      const lower = key.toLowerCase()
      if (isQuitKey(key)) {
        end('2048 terminated by user')
        return true
      }
      const direction = DIRECTIONS[lower]
      if (!direction) return false
      const moved = slide(direction)
      if (moved) {
        addTile()
        if (!canMove()) {
          render()
          end('game over — out of moves, the heap is fragmented')
          return true
        }
      }
      render(moved ? '' : '(nothing moved)')
      return true
    },
    stop: () => {}
  }
}

export function createHangmanGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)]!
  const guessed = new Set<string>()
  let wrong = 0

  function masked() {
    return [...word].map((ch) => (guessed.has(ch) ? ch : '_')).join(' ')
  }

  function render(message = '') {
    const wrongLetters = [...guessed].filter((ch) => !word.includes(ch)).join(' ') || '—'
    onFrame(
      [
        `HANGMAN  (type letters, q quits)`,
        '',
        ...GALLOWS[wrong]!,
        '',
        `word:  ${masked()}`,
        `wrong: ${wrongLetters}  (${wrong}/${GALLOWS.length - 1})`,
        message
      ].join('\n')
    )
  }

  function won() {
    return [...word].every((ch) => guessed.has(ch))
  }

  render()

  return {
    onKey(key) {
      const lower = key.toLowerCase()
      if (isQuitKey(key)) {
        onEnd([`hangman aborted — the word was '${word}'`])
        return true
      }
      if (!/^[a-z]$/.test(lower)) return false
      if (guessed.has(lower)) {
        render(`already tried '${lower}'`)
        return true
      }
      guessed.add(lower)
      if (!word.includes(lower)) wrong++

      if (won()) {
        onEnd([`you win! the word was '${word}' 🎉`, `wrong guesses: ${wrong}`])
      } else if (wrong >= GALLOWS.length - 1) {
        render()
        onEnd([`game over — the word was '${word}'`, 'the hangman sends his regards'])
      } else {
        render()
      }
      return true
    },
    stop: () => {}
  }
}
