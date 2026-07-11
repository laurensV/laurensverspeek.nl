import { describe, it, expect } from 'vitest'
import { validSubmission, addScore, cleanName, emptyBoards, MAX_SCORES, LEADERBOARD_GAMES } from '../realtime/scores-core.mjs'

describe('validSubmission', () => {
  it('accepts an in-range integer score for a known game', () => {
    expect(validSubmission({ game: 'snake', score: 120 })).toBe(true)
    expect(validSubmission({ game: 'wpm', score: 88 })).toBe(true)
  })

  it('rejects unknown games, non-integers, negatives, Infinity and over-cap', () => {
    expect(validSubmission({ game: 'doom', score: 10 })).toBe(false)
    expect(validSubmission({ game: 'snake', score: 12.5 })).toBe(false)
    expect(validSubmission({ game: 'snake', score: -1 })).toBe(false)
    expect(validSubmission({ game: 'snake', score: Infinity })).toBe(false)
    expect(validSubmission({ game: 'wpm', score: 100000 })).toBe(false) // over cap
    expect(validSubmission(null)).toBe(false)
    expect(validSubmission({ game: 'snake' })).toBe(false)
  })
})

describe('addScore', () => {
  it('keeps the board sorted descending and capped at the top N', () => {
    let board = []
    for (let i = 1; i <= MAX_SCORES + 3; i++) board = addScore(board, { name: `p${i}`, score: i * 10, at: 0 })
    expect(board).toHaveLength(MAX_SCORES)
    expect(board[0].score).toBe((MAX_SCORES + 3) * 10) // biggest first
    expect(board.at(-1).score).toBeGreaterThan(0)
    // a tiny score doesn't displace the full board
    const before = board.at(-1).score
    board = addScore(board, { name: 'low', score: 5, at: 0 })
    expect(board.at(-1).score).toBe(before)
  })
})

describe('cleanName / emptyBoards', () => {
  it('sanitizes names to a safe handle', () => {
    expect(cleanName('  Hello World! ')).toBe('helloworld')
    expect(cleanName('<script>')).toBe('script')
    expect(cleanName('')).toBe('anon')
    expect(cleanName(42)).toBe('anon')
  })

  it('starts one empty list per game', () => {
    const boards = emptyBoards()
    expect(Object.keys(boards).sort()).toEqual([...LEADERBOARD_GAMES].sort())
    expect(boards.snake).toEqual([])
  })
})
