// Mini-games playable inside the terminal overlay.
// A game receives callbacks to draw frames and report its final output lines;
// the terminal routes keystrokes to the active game via `onKey`.
// Shared boilerplate (high scores, tick timers, quit keys) lives in terminalGameKit.

import { finalScoreLines, createTicker, isQuitKey, useHighScore } from '~/utils/terminalGameKit'
import { seedRandom, step as lifeStep, population } from '~/utils/gameOfLife'

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

// `top`: a live (fake) process monitor. Not a game you win — a game you watch.
const TOP_PROCESSES = [
  { pid: 1, user: 'root', cmd: '/sbin/init' },
  { pid: 142, user: 'visitor', cmd: 'nuxt dev --turbo' },
  { pid: 256, user: 'visitor', cmd: 'node terminal.js' },
  { pid: 404, user: 'visitor', cmd: 'chrome --renderer' },
  { pid: 512, user: 'visitor', cmd: 'lvsh' },
  { pid: 666, user: 'visitor', cmd: 'dot-grid.css' },
  { pid: 777, user: 'root', cmd: 'crypto-miner (jk)' },
  { pid: 1024, user: 'visitor', cmd: 'vite hmr-server' },
  { pid: 2048, user: 'visitor', cmd: 'game-of-life' }
]

export function createTopGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  const start = Date.now()

  const render = () => {
    const rows = [...TOP_PROCESSES]
      .map((p) => ({ ...p, cpu: Math.random() * (p.cmd.includes('chrome') ? 60 : 25), mem: Math.random() * 12 }))
      .sort((a, b) => b.cpu - a.cpu)
    const totalCpu = rows.reduce((sum, r) => sum + r.cpu, 0)
    const upSecs = Math.floor((Date.now() - start) / 1000)

    const header = [
      `top - lvsh session, up ${upSecs}s,  1 user,  load average: ${(totalCpu / 100).toFixed(2)}, 0.42, 0.13`,
      `Tasks: ${TOP_PROCESSES.length} total,  ${rows.filter((r) => r.cpu > 20).length} running`,
      `%Cpu(s): ${totalCpu.toFixed(1).padStart(4)} us   (q to quit)`,
      '',
      '  PID USER      %CPU  %MEM  COMMAND'
    ]
    const body = rows.map(
      (r) =>
        `${String(r.pid).padStart(5)} ${r.user.padEnd(8)} ${r.cpu.toFixed(1).padStart(5)} ${r.mem.toFixed(1).padStart(5)}  ${r.cmd}`
    )
    onFrame([...header, ...body].join('\n'))
  }

  render()
  const ticker = createTicker(render, () => 1200)
  ticker.start()

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        ticker.stop()
        onEnd(['top: exited'])
        return true
      }
      return false
    },
    stop: () => ticker.stop()
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

const LIFE_W = 46
const LIFE_H = 20
const LIFE_SEED = 0.3

// Conway's Game of Life as an ASCII terminal game, reusing ~/utils/gameOfLife.
export function createLifeGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  let grid = seedRandom(LIFE_W, LIFE_H, LIFE_SEED)
  let gen = 0
  let paused = false

  const render = () => {
    const rule = '─'.repeat(LIFE_W)
    const rows: string[] = []
    for (let y = 0; y < LIFE_H; y++) {
      let row = ''
      for (let x = 0; x < LIFE_W; x++) row += grid[y * LIFE_W + x] ? '█' : ' '
      rows.push(`│${row}│`)
    }
    const header = `conway's game of life — gen ${gen}, pop ${population(grid)}${paused ? '  [paused]' : ''}`
    onFrame([header, `┌${rule}┐`, ...rows, `└${rule}┘`, 'space pause · r reseed · q quit'].join('\n'))
  }

  const tick = () => {
    if (paused) return
    grid = lifeStep(grid, LIFE_W, LIFE_H)
    gen++
    // reseed a soup if the board fizzles out, so it never goes empty
    if (population(grid) < LIFE_W * LIFE_H * 0.02) {
      grid = seedRandom(LIFE_W, LIFE_H, LIFE_SEED)
      gen = 0
    }
    render()
  }

  render()
  const ticker = createTicker(tick, () => 160)
  ticker.start()

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        ticker.stop()
        onEnd([`life: exited after ${gen} generations`])
        return true
      }
      if (key === ' ') {
        paused = !paused
        render()
        return true
      }
      if (key.toLowerCase() === 'r') {
        grid = seedRandom(LIFE_W, LIFE_H, LIFE_SEED)
        gen = 0
        render()
        return true
      }
      return false
    },
    stop: () => ticker.stop()
  }
}

const WPM_HIGHSCORE_KEY = 'lv-wpm-highscore'
const WPM_WIDTH = 46

const WPM_PASSAGES = [
  'the quick brown fox jumps over the lazy dog while the terminal hums quietly in amber',
  'a static site can still feel alive if you hide enough easter eggs in its corners',
  'first solve the problem then write the code then delete half of it the next morning',
  'a good commit message explains why the change exists not what the diff already shows',
  'somewhere between vim and the browser every developer ends up building a tiny os'
]

/** Words-per-minute (5 chars = 1 word) and accuracy over all keystrokes. */
export function wpmStats(correctChars: number, keystrokes: number, errors: number, elapsedMs: number) {
  const minutes = elapsedMs / 60_000
  const wpm = minutes > 0 ? Math.round(correctChars / 5 / minutes) : 0
  const accuracy = keystrokes > 0 ? Math.round(((keystrokes - errors) / keystrokes) * 100) : 100
  return { wpm, accuracy }
}

/** Word-wrap that keeps the join reversible: lines.join(' ') === text. */
function wrapPassage(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

// A typing test: type the passage, markers under each line show hits (·) and
// misses (x). Ends when the passage length is reached; Esc aborts.
export function createWpmGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  const passage = WPM_PASSAGES[Math.floor(Math.random() * WPM_PASSAGES.length)]!
  const wrapped = wrapPassage(passage, WPM_WIDTH)
  let typed = ''
  let errors = 0
  let keystrokes = 0
  let startedAt = 0

  const elapsed = () => (startedAt ? Date.now() - startedAt : 0)

  const render = () => {
    const rows: string[] = ['WPM TEST  (type the passage, Esc quits)', '']
    let offset = 0
    for (const line of wrapped) {
      rows.push(`  ${line}`)
      let markers = ''
      for (let i = offset; i < offset + line.length; i++) {
        if (i < typed.length) markers += typed[i] === passage[i] ? '·' : 'x'
        else markers += i === typed.length ? '_' : ' '
      }
      rows.push(`  ${markers}`)
      offset += line.length + 1 // +1 for the space swallowed by the wrap
    }
    const { wpm, accuracy } = wpmStats(countCorrect(), keystrokes, errors, elapsed())
    rows.push('', `  ${(elapsed() / 1000).toFixed(1)}s · ${wpm} wpm · ${accuracy}% acc`)
    onFrame(rows.join('\n'))
  }

  const countCorrect = () => [...typed].filter((ch, i) => ch === passage[i]).length

  const ticker = createTicker(render, () => 500)

  const finish = () => {
    ticker.stop()
    const { wpm, accuracy } = wpmStats(countCorrect(), keystrokes, errors, elapsed())
    onEnd(
      finalScoreLines(WPM_HIGHSCORE_KEY, wpm, {
        headline: 'test complete!',
        scoreLabel: `${wpm} wpm · ${accuracy}% accuracy · ${(elapsed() / 1000).toFixed(1)}s`
      })
    )
  }

  render()

  return {
    onKey(key) {
      if (key === 'Escape') {
        ticker.stop()
        onEnd(['typing test aborted — the keyboard lives to fight another day'])
        return true
      }
      if (key === 'Backspace') {
        typed = typed.slice(0, -1)
        render()
        return true
      }
      if (key.length !== 1) return false
      if (!startedAt) {
        startedAt = Date.now()
        ticker.start()
      }
      keystrokes++
      if (key !== passage[typed.length]) errors++
      typed += key
      if (typed.length >= passage.length) finish()
      else render()
      return true
    },
    stop: () => ticker.stop()
  }
}

const PONG_W = 41
const PONG_H = 13
const PONG_PADDLE = 3
const PONG_WIN = 5
const PONG_RALLY_KEY = 'lv-pong-rally'

// Classic pong: left paddle is yours, the right one is a slightly fallible AI.
// First to 5 wins; the ball speeds up as a rally builds.
export function createPongGame({ onFrame, onEnd }: GameCallbacks): GameHandle {
  let playerY = Math.floor(PONG_H / 2) - 1
  let aiY = playerY
  let ball = { x: PONG_W / 2, y: PONG_H / 2, vx: -1, vy: 0.5 }
  let playerScore = 0
  let aiScore = 0
  let rally = 0
  let bestRally = 0

  const resetBall = (towards: 1 | -1) => {
    ball = { x: PONG_W / 2, y: PONG_H / 2, vx: towards, vy: Math.random() > 0.5 ? 0.5 : -0.5 }
    rally = 0
  }

  const paddleHit = (paddleY: number) => {
    const y = Math.round(ball.y)
    if (y < paddleY || y >= paddleY + PONG_PADDLE) return false
    // deflection angle depends on where the ball meets the paddle
    ball.vy = (ball.y - (paddleY + PONG_PADDLE / 2)) * 0.6
    rally++
    bestRally = Math.max(bestRally, rally)
    return true
  }

  const render = () => {
    const rows: string[] = []
    for (let y = 0; y < PONG_H; y++) {
      let row = ''
      for (let x = 0; x < PONG_W; x++) {
        const isBall = Math.round(ball.x) === x && Math.round(ball.y) === y
        const isPlayer = x === 1 && y >= playerY && y < playerY + PONG_PADDLE
        const isAi = x === PONG_W - 2 && y >= aiY && y < aiY + PONG_PADDLE
        const isNet = x === Math.floor(PONG_W / 2) && y % 2 === 0
        row += isBall ? '●' : isPlayer || isAi ? '█' : isNet ? '·' : ' '
      }
      rows.push(row)
    }
    const score = `you ${playerScore} — ${aiScore} cpu`
    onFrame([
      `PONG  ${score}  (w/s or ↑/↓ · q quits)`,
      `┌${'─'.repeat(PONG_W)}┐`,
      ...rows.map((row) => `│${row}│`),
      `└${'─'.repeat(PONG_W)}┘`
    ].join('\n'))
  }

  const finish = () => {
    ticker.stop()
    const won = playerScore > aiScore
    const { isNew, best } = useHighScore(PONG_RALLY_KEY).record(bestRally)
    onEnd([
      won ? `you win ${playerScore}–${aiScore}! the cpu demands a rematch` : `the cpu wins ${aiScore}–${playerScore} — it had it coming`,
      `longest rally: ${bestRally} hits`,
      isNew ? `new rally record! previous best: ${best}` : `rally record: ${best}`
    ])
  }

  const tick = () => {
    ball.x += ball.vx
    ball.y += ball.vy
    // wall bounce
    if (ball.y <= 0) {
      ball.y = 0
      ball.vy = Math.abs(ball.vy)
    } else if (ball.y >= PONG_H - 1) {
      ball.y = PONG_H - 1
      ball.vy = -Math.abs(ball.vy)
    }
    // paddles
    if (ball.vx < 0 && Math.round(ball.x) <= 1) {
      if (paddleHit(playerY)) ball.vx = 1
      else {
        aiScore++
        if (aiScore >= PONG_WIN) return finish()
        resetBall(-1)
      }
    } else if (ball.vx > 0 && Math.round(ball.x) >= PONG_W - 2) {
      if (paddleHit(aiY)) ball.vx = -1
      else {
        playerScore++
        if (playerScore >= PONG_WIN) return finish()
        resetBall(1)
      }
    }
    // the AI tracks the ball, one row per tick, and hesitates far from it
    const target = Math.round(ball.y) - Math.floor(PONG_PADDLE / 2)
    if (ball.vx > 0 && ball.x > PONG_W / 3) {
      if (aiY < target) aiY++
      else if (aiY > target) aiY--
      aiY = Math.max(0, Math.min(PONG_H - PONG_PADDLE, aiY))
    }
    render()
  }

  render()
  // the rally speeds the ball up; resets each point
  const ticker = createTicker(tick, () => Math.max(45, 85 - rally * 4))
  ticker.start()

  const movePlayer = (delta: number) => {
    playerY = Math.max(0, Math.min(PONG_H - PONG_PADDLE, playerY + delta))
    render()
  }

  return {
    onKey(key) {
      if (isQuitKey(key)) {
        ticker.stop()
        onEnd([`pong aborted at ${playerScore}–${aiScore} — the cpu claims victory by default`])
        return true
      }
      const lower = key.toLowerCase()
      if (key === 'ArrowUp' || lower === 'w') {
        movePlayer(-1)
        return true
      }
      if (key === 'ArrowDown' || lower === 's') {
        movePlayer(1)
        return true
      }
      return false
    },
    stop: () => ticker.stop()
  }
}
