import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSnakeGame, createTetrisGame, create2048Game, createWpmGame, createPongGame, wpmStats, type GameCallbacks } from '~/utils/terminalGames'

// the games persist high scores; give them an in-memory localStorage
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key)
})

const makeCallbacks = () => {
  const frames: string[] = []
  const ended: string[][] = []
  const callbacks: GameCallbacks = {
    onFrame: (frame) => frames.push(frame),
    onEnd: (lines) => ended.push(lines)
  }
  return { frames, ended, callbacks }
}

beforeEach(() => {
  vi.useFakeTimers()
  storage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('create2048Game', () => {
  it('starts with two tiles on the board', () => {
    const { frames, callbacks } = makeCallbacks()
    create2048Game(callbacks)
    const tiles = frames[0]!.match(/\b[24]\b/g) ?? []
    expect(tiles.length).toBe(2)
  })

  it('consumes direction keys and ignores others', () => {
    const { callbacks } = makeCallbacks()
    const game = create2048Game(callbacks)
    expect(game.onKey('ArrowLeft')).toBe(true)
    expect(game.onKey('w')).toBe(true)
    expect(game.onKey('F5')).toBe(false)
  })

  it('ends with a final score and reports the high score on q', () => {
    const { ended, callbacks } = makeCallbacks()
    const game = create2048Game(callbacks)
    game.onKey('q')
    expect(ended).toHaveLength(1)
    expect(ended[0]!.join('\n')).toContain('final score')
    expect(ended[0]!.join('\n')).toContain('high score')
  })
})

describe('createTetrisGame', () => {
  it('renders a well with a falling piece', () => {
    const { frames, callbacks } = makeCallbacks()
    const game = createTetrisGame(callbacks)
    expect(frames[0]).toContain('TETRIS')
    expect(frames[0]).toContain('██')
    game.stop()
  })

  it('drops pieces on gravity ticks', () => {
    const { frames, callbacks } = makeCallbacks()
    const game = createTetrisGame(callbacks)
    const before = frames.length
    vi.advanceTimersByTime(1000)
    expect(frames.length).toBeGreaterThan(before)
    game.stop()
  })

  it('hard drop locks the piece at the bottom and spawns the next one', () => {
    const { frames, callbacks } = makeCallbacks()
    const game = createTetrisGame(callbacks)
    expect(game.onKey(' ')).toBe(true)
    // bottom row of the well now contains locked blocks
    const rows = frames.at(-1)!.split('\n')
    const bottomRow = rows[rows.length - 2]!
    expect(bottomRow).toContain('██')
    game.stop()
  })

  it('ends via q with a score line', () => {
    const { ended, callbacks } = makeCallbacks()
    const game = createTetrisGame(callbacks)
    game.onKey('q')
    expect(ended[0]!.join('\n')).toContain('final score')
  })
})

describe('createSnakeGame', () => {
  it('moves the snake on each tick and dies against the wall', () => {
    const { ended, callbacks } = makeCallbacks()
    createSnakeGame(callbacks)
    // heading right from x=8 toward the wall at x=25: crash within 20 ticks
    vi.advanceTimersByTime(130 * 20)
    expect(ended).toHaveLength(1)
    expect(ended[0]!.join('\n')).toContain('segfault')
  })

  it('q ends the game immediately', () => {
    const { ended, callbacks } = makeCallbacks()
    const game = createSnakeGame(callbacks)
    game.onKey('q')
    expect(ended[0]![0]).toContain('terminated')
  })
})

describe('createWpmGame', () => {
  it('shows the passage with a cursor marker before any typing', () => {
    const { frames, callbacks } = makeCallbacks()
    createWpmGame(callbacks)
    expect(frames[0]).toContain('WPM TEST')
    expect(frames[0]).toContain('_')
  })

  it('marks hits and misses under the passage', () => {
    const { frames, callbacks } = makeCallbacks()
    const game = createWpmGame(callbacks)
    const firstChar = frames[0]!.split('\n')[2]!.trim()[0]!
    // the passage text itself may contain an x, so only inspect the marker row
    const markerRow = () => frames.at(-1)!.split('\n')[3]!
    expect(game.onKey(firstChar)).toBe(true) // correct
    expect(markerRow()).toContain('·')
    game.onKey('%') // definitely wrong: passages are lowercase words
    expect(markerRow()).toContain('x')
    // backspace erases the miss again
    game.onKey('Backspace')
    expect(markerRow()).not.toContain('x')
  })

  it('ignores non-printable keys and aborts on Escape', () => {
    const { ended, callbacks } = makeCallbacks()
    const game = createWpmGame(callbacks)
    expect(game.onKey('ArrowLeft')).toBe(false)
    expect(game.onKey('Escape')).toBe(true)
    expect(ended[0]!.join('\n')).toContain('aborted')
  })

  it('finishes with wpm, accuracy and a high score line', () => {
    const { frames, ended, callbacks } = makeCallbacks()
    const game = createWpmGame(callbacks)
    // reconstruct the passage from the rendered frame (text/marker rows alternate)
    const rows = frames[0]!.split('\n').slice(2, -2)
    const passage = rows.filter((_, i) => i % 2 === 0).map((row) => row.slice(2)).join(' ')
    for (const ch of passage) {
      vi.advanceTimersByTime(20) // let the clock move so wpm is finite
      game.onKey(ch)
    }
    expect(ended).toHaveLength(1)
    const summary = ended[0]!.join('\n')
    expect(summary).toContain('wpm')
    expect(summary).toContain('100% accuracy')
    expect(summary).toContain('high score')
  })
})

describe('wpmStats', () => {
  it('computes words per minute at 5 chars per word', () => {
    expect(wpmStats(300, 300, 0, 60_000).wpm).toBe(60)
    expect(wpmStats(150, 160, 10, 30_000)).toEqual({ wpm: 60, accuracy: 94 })
  })

  it('is safe before the clock starts', () => {
    expect(wpmStats(0, 0, 0, 0)).toEqual({ wpm: 0, accuracy: 100 })
  })
})

describe('createPongGame', () => {
  it('renders the court with both paddles, the ball and the score', () => {
    const { frames, callbacks } = makeCallbacks()
    createPongGame(callbacks)
    expect(frames[0]).toContain('PONG  you 0')
    expect(frames[0]).toContain('0 cpu')
    expect(frames[0]).toContain('●')
  })

  it('moves the player paddle with w/s and ignores other keys', () => {
    const { frames, callbacks } = makeCallbacks()
    const game = createPongGame(callbacks)
    const paddleRow = () => frames.at(-1)!.split('\n').findIndex((row) => row[1 + 1] === '█')
    const before = paddleRow()
    expect(game.onKey('w')).toBe(true)
    expect(paddleRow()).toBe(before - 1)
    expect(game.onKey('ArrowDown')).toBe(true)
    expect(paddleRow()).toBe(before)
    expect(game.onKey('F5')).toBe(false)
  })

  it('plays points over time until someone reaches five', () => {
    const { ended, callbacks } = makeCallbacks()
    const game = createPongGame(callbacks)
    // park the player paddle in the top corner so center balls sail past
    for (let i = 0; i < 12; i++) game.onKey('w')
    vi.advanceTimersByTime(120_000)
    expect(ended).toHaveLength(1)
    expect(ended[0]!.join('\n')).toMatch(/wins|win/)
    expect(ended[0]!.join('\n')).toContain('rally')
  })

  it('quits on q with a concession message', () => {
    const { ended, callbacks } = makeCallbacks()
    const game = createPongGame(callbacks)
    game.onKey('q')
    expect(ended[0]![0]).toContain('aborted')
  })
})
