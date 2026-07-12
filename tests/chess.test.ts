import { describe, it, expect } from 'vitest'
import {
  initialState, legalMoves, applyMove, inCheck, gameOver, bestMove, squareName, evaluate
} from '../app/utils/chess'
import type { ChessState, Piece } from '../app/utils/chess'

// build a state from 8 rank strings (a8→h1), '.' = empty
const pos = (rows: string[], turn: 'w' | 'b' = 'w'): ChessState => ({
  board: rows.join('').split('').map((ch) => (ch === '.' ? '' : ch)) as Piece[],
  turn,
  castling: { wK: false, wQ: false, bK: false, bQ: false },
  ep: null
})

const idx = (name: string) => 'abcdefgh'.indexOf(name[0]!) + (8 - Number(name[1])) * 8
const moveNames = (state: ChessState) => legalMoves(state).map((m) => `${squareName(m.from)}${squareName(m.to)}`)

describe('legalMoves', () => {
  it('gives white 20 moves at the start', () => {
    expect(legalMoves(initialState())).toHaveLength(20)
  })

  it('forbids moves that leave the king in check (pins)', () => {
    // white king e1, white rook e2 pinned by black rook e8
    const state = pos([
      '....r...',
      '........',
      '........',
      '........',
      '........',
      '........',
      '....R...',
      '....K...'
    ])
    const rookMoves = moveNames(state).filter((m) => m.startsWith('e2'))
    // the pinned rook may only slide along the e-file
    expect(rookMoves.every((m) => m[2] === 'e')).toBe(true)
    expect(rookMoves.length).toBeGreaterThan(0)
  })

  it('supports castling only through safe, empty squares', () => {
    const state: ChessState = {
      ...pos([
        'r...k..r',
        '........',
        '........',
        '........',
        '........',
        '........',
        '........',
        'R...K..R'
      ]),
      castling: { wK: true, wQ: true, bK: true, bQ: true }
    }
    const moves = moveNames(state)
    expect(moves).toContain('e1g1')
    expect(moves).toContain('e1c1')
    // a black rook watching f1 forbids kingside castling
    const guarded = { ...state, board: [...state.board] }
    guarded.board[idx('f8')] = 'r'
    expect(moveNames(guarded)).not.toContain('e1g1')
  })

  it('handles en passant', () => {
    const state = pos([
      '....k...',
      '........',
      '........',
      '........',
      '.....p..',
      '........',
      '....P...',
      '....K...'
    ])
    // e2-e4 exposes the en passant capture f4xe3
    const after = applyMove(state, { from: idx('e2'), to: idx('e4') })
    expect(after.ep).toBe(idx('e3'))
    const black = moveNames(after)
    expect(black).toContain('f4e3')
    const ep = legalMoves(after).find((m) => m.to === idx('e3'))!
    const done = applyMove(after, ep)
    expect(done.board[idx('e4')]).toBe('') // the pawn is really gone
  })

  it('promotes pawns to queens', () => {
    const state = pos([
      '....k...',
      'P.......',
      '........',
      '........',
      '........',
      '........',
      '........',
      '....K...'
    ])
    const promo = legalMoves(state).find((m) => m.from === idx('a7'))!
    expect(promo.promo).toBe('Q')
    expect(applyMove(state, promo).board[idx('a8')]).toBe('Q')
  })
})

describe('game over', () => {
  it('sees back-rank checkmate', () => {
    const state = pos([
      '....k...',
      '.R......',
      '........',
      '........',
      '........',
      '........',
      '........',
      'R...K...'
    ])
    // Ra1-a8 is mate: the b7 rook covers every rank-7 escape square
    const mate = applyMove(state, { from: idx('a1'), to: idx('a8') })
    expect(inCheck(mate, 'b')).toBe(true)
    expect(gameOver(mate)).toBe('checkmate')
  })

  it('sees stalemate', () => {
    const state = pos([
      'k.......',
      '..Q.....',
      '.K......',
      '........',
      '........',
      '........',
      '........',
      '........'
    ], 'b')
    expect(inCheck(state, 'b')).toBe(false)
    expect(gameOver(state)).toBe('stalemate')
  })
})

describe('the house AI', () => {
  it('takes a hanging queen', () => {
    const state = pos([
      '....k...',
      '........',
      '........',
      '...q....',
      '........',
      '..N.....',
      '........',
      '....K...'
    ])
    const move = bestMove(state, 2)!
    expect(squareName(move.to)).toBe('d5')
  })

  it('evaluate counts material for white as positive', () => {
    expect(evaluate(initialState().board)).toBe(0)
    const state = pos(['....k...', '........', '........', '........', '........', '........', '........', 'Q...K...'])
    expect(evaluate(state.board)).toBeGreaterThan(800)
  })
})
