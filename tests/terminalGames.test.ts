import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSnakeGame, createTetrisGame, create2048Game, type GameCallbacks } from '~/utils/terminalGames'

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
