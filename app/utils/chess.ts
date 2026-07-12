// Chess for the lvOS chess app. The RULES (legal moves, check, mate) live in
// realtime/chess-core.mjs, shared verbatim with the relay server so online
// matches are validated by the exact code the client plays by. This module
// re-exports them and adds the client-only bits: the house AI and the glyphs.

import { legalMoves, applyMove, gameOver, sideOf } from '../../realtime/chess-core.mjs'
import type { ChessState, ChessMove, Piece } from '../../realtime/chess-core.mjs'

export {
  START_FEN_ROWS, initialState, sideOf, pseudoMoves, attacked, kingSquare,
  inCheck, applyMove, legalMoves, gameOver, squareName
} from '../../realtime/chess-core.mjs'
export type { Piece, Side, ChessMove, ChessState, GameOver } from '../../realtime/chess-core.mjs'

// ---- the house AI: shallow alpha-beta over material + placement ----

const VALUE: Record<string, number> = { P: 100, N: 305, B: 320, R: 500, Q: 900, K: 0 }

const row = (i: number) => Math.floor(i / 8)
const col = (i: number) => i % 8

/** Positive is good for white. */
export function evaluate(board: Piece[]): number {
  let score = 0
  for (let i = 0; i < 64; i++) {
    const piece = board[i]!
    if (!piece) continue
    const value = VALUE[piece.toUpperCase()]!
    // a whisper of positional taste: centralization for everyone but the king
    const r = row(i)
    const c = col(i)
    const center = piece.toUpperCase() === 'K' ? 0 : 6 - (Math.abs(3.5 - r) + Math.abs(3.5 - c))
    score += (value + center * 2) * (sideOf(piece) === 'w' ? 1 : -1)
  }
  return score
}

function negamax(state: ChessState, depth: number, alpha: number, beta: number): number {
  const over = gameOver(state)
  if (over === 'checkmate') return -100000 - depth // prefer faster mates
  if (over === 'stalemate') return 0
  const sign = state.turn === 'w' ? 1 : -1
  if (depth === 0) return sign * evaluate(state.board)

  // captures first makes the pruning bite
  const moves = legalMoves(state)
    .sort((a, b) => (state.board[b.to] ? 1 : 0) - (state.board[a.to] ? 1 : 0))
  let best = -Infinity
  for (const move of moves) {
    const score = -negamax(applyMove(state, move), depth - 1, -beta, -alpha)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

/** Pick the AI's move (for the side to move). Depth 2 keeps it beatable AND fast. */
export function bestMove(state: ChessState, depth = 2): ChessMove | null {
  const moves = legalMoves(state)
    .sort((a, b) => (state.board[b.to] ? 1 : 0) - (state.board[a.to] ? 1 : 0))
  let best: ChessMove | null = null
  let bestScore = -Infinity
  let alpha = -Infinity
  for (const move of moves) {
    const score = -negamax(applyMove(state, move), depth - 1, -Infinity, -alpha)
    if (score > bestScore) {
      bestScore = score
      best = move
      if (score > alpha) alpha = score
    }
  }
  return best
}

export const PIECE_GLYPHS: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
}
