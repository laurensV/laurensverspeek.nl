// A small, pure chess engine for the lvOS chess app: full legal moves
// (castling, promotion, en passant), check/checkmate/stalemate detection and a
// shallow alpha-beta search for the house AI. Board: 64 cells, row-major from
// a8 (index 0) to h1 (index 63). FEN-style piece letters — uppercase white.

export type Piece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k' | ''
export type Side = 'w' | 'b'

export interface ChessMove {
  from: number
  to: number
  /** promotion piece (always queen for the app) */
  promo?: Piece
  /** rook's from/to when castling */
  castle?: { from: number, to: number }
  /** captured pawn's square for en passant */
  ep?: number
}

export interface ChessState {
  board: Piece[]
  turn: Side
  castling: { wK: boolean, wQ: boolean, bK: boolean, bQ: boolean }
  /** square a pawn just double-stepped over (en passant target), or null */
  ep: number | null
}

export const START_FEN_ROWS = ['rnbqkbnr', 'pppppppp', '', '', '', '', 'PPPPPPPP', 'RNBQKBNR']

export function initialState(): ChessState {
  const board: Piece[] = Array.from({ length: 64 }, () => '')
  START_FEN_ROWS.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) board[r * 8 + c] = row[c] as Piece
  })
  return { board, turn: 'w', castling: { wK: true, wQ: true, bK: true, bQ: true }, ep: null }
}

export const sideOf = (piece: Piece): Side | null =>
  piece === '' ? null : piece === piece.toUpperCase() ? 'w' : 'b'

const row = (i: number) => Math.floor(i / 8)
const col = (i: number) => i % 8
const on = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8

const RAYS: Record<string, [number, number][]> = {
  B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  Q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
}
const KNIGHT: [number, number][] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]

/** All pseudo-legal moves for `side` (may leave own king in check). */
export function pseudoMoves(state: ChessState, side: Side): ChessMove[] {
  const { board } = state
  const moves: ChessMove[] = []
  const push = (from: number, to: number, extra: Partial<ChessMove> = {}) => {
    moves.push({ from, to, ...extra })
  }

  for (let i = 0; i < 64; i++) {
    const piece = board[i]!
    if (!piece || sideOf(piece) !== side) continue
    const r = row(i)
    const c = col(i)
    const kind = piece.toUpperCase()

    if (kind === 'P') {
      const dir = side === 'w' ? -1 : 1
      const startRow = side === 'w' ? 6 : 1
      const promoRow = side === 'w' ? 0 : 7
      const one = (r + dir) * 8 + c
      if (on(r + dir, c) && !board[one]) {
        push(i, one, r + dir === promoRow ? { promo: (side === 'w' ? 'Q' : 'q') } : {})
        const two = (r + 2 * dir) * 8 + c
        if (r === startRow && !board[two]) push(i, two)
      }
      for (const dc of [-1, 1]) {
        if (!on(r + dir, c + dc)) continue
        const target = (r + dir) * 8 + c + dc
        const victim = board[target]!
        if (victim && sideOf(victim) !== side) {
          push(i, target, r + dir === promoRow ? { promo: (side === 'w' ? 'Q' : 'q') } : {})
        } else if (state.ep === target && !victim) {
          push(i, target, { ep: r * 8 + c + dc })
        }
      }
    } else if (kind === 'N' || kind === 'K') {
      const steps = kind === 'N' ? KNIGHT : RAYS.Q!
      for (const [dr, dc] of steps) {
        if (!on(r + dr, c + dc)) continue
        const target = (r + dr) * 8 + c + dc
        if (sideOf(board[target]!) !== side) push(i, target)
      }
      if (kind === 'K') {
        // castling: rights intact, path empty, king not crossing attacked squares
        const home = side === 'w' ? 7 : 0
        const rights = state.castling
        const canK = side === 'w' ? rights.wK : rights.bK
        const canQ = side === 'w' ? rights.wQ : rights.bQ
        if (r === home && c === 4 && !inCheck(state, side)) {
          if (canK && !board[home * 8 + 5] && !board[home * 8 + 6]
            && !attacked(state, home * 8 + 5, side) && !attacked(state, home * 8 + 6, side)) {
            push(i, home * 8 + 6, { castle: { from: home * 8 + 7, to: home * 8 + 5 } })
          }
          if (canQ && !board[home * 8 + 3] && !board[home * 8 + 2] && !board[home * 8 + 1]
            && !attacked(state, home * 8 + 3, side) && !attacked(state, home * 8 + 2, side)) {
            push(i, home * 8 + 2, { castle: { from: home * 8, to: home * 8 + 3 } })
          }
        }
      }
    } else {
      for (const [dr, dc] of RAYS[kind]!) {
        let rr = r + dr
        let cc = c + dc
        while (on(rr, cc)) {
          const target = rr * 8 + cc
          const victim = board[target]!
          if (!victim) push(i, target)
          else {
            if (sideOf(victim) !== side) push(i, target)
            break
          }
          rr += dr
          cc += dc
        }
      }
    }
  }
  return moves
}

/** Is `square` attacked by the opponent of `side`? */
export function attacked(state: ChessState, square: number, side: Side): boolean {
  const foe: Side = side === 'w' ? 'b' : 'w'
  const { board } = state
  const r = row(square)
  const c = col(square)
  // pawns
  const dir = foe === 'w' ? 1 : -1 // squares a foe pawn would attack FROM
  for (const dc of [-1, 1]) {
    if (!on(r + dir, c + dc)) continue
    const piece = board[(r + dir) * 8 + c + dc]!
    if (piece.toUpperCase() === 'P' && sideOf(piece) === foe) return true
  }
  // knights
  for (const [dr, dc] of KNIGHT) {
    if (!on(r + dr, c + dc)) continue
    const piece = board[(r + dr) * 8 + c + dc]!
    if (piece.toUpperCase() === 'N' && sideOf(piece) === foe) return true
  }
  // king adjacency
  for (const [dr, dc] of RAYS.Q!) {
    if (!on(r + dr, c + dc)) continue
    const piece = board[(r + dr) * 8 + c + dc]!
    if (piece.toUpperCase() === 'K' && sideOf(piece) === foe) return true
  }
  // sliders
  for (const [dr, dc] of RAYS.Q!) {
    let rr = r + dr
    let cc = c + dc
    while (on(rr, cc)) {
      const piece = board[rr * 8 + cc]!
      if (piece) {
        if (sideOf(piece) === foe) {
          const kind = piece.toUpperCase()
          const diagonal = dr !== 0 && dc !== 0
          if (kind === 'Q' || (diagonal && kind === 'B') || (!diagonal && kind === 'R')) return true
        }
        break
      }
      rr += dr
      cc += dc
    }
  }
  return false
}

export function kingSquare(board: Piece[], side: Side): number {
  const king = side === 'w' ? 'K' : 'k'
  return board.indexOf(king)
}

export function inCheck(state: ChessState, side: Side): boolean {
  return attacked(state, kingSquare(state.board, side), side)
}

/** Apply a move, returning the next state (input untouched). */
export function applyMove(state: ChessState, move: ChessMove): ChessState {
  const board = [...state.board]
  const piece = board[move.from]!
  board[move.to] = move.promo ?? piece
  board[move.from] = ''
  if (move.castle) {
    board[move.castle.to] = board[move.castle.from]!
    board[move.castle.from] = ''
  }
  if (move.ep !== undefined) board[move.ep] = ''

  const castling = { ...state.castling }
  if (piece === 'K') castling.wK = castling.wQ = false
  if (piece === 'k') castling.bK = castling.bQ = false
  for (const square of [move.from, move.to]) {
    if (square === 63) castling.wK = false
    if (square === 56) castling.wQ = false
    if (square === 7) castling.bK = false
    if (square === 0) castling.bQ = false
  }

  let ep: number | null = null
  if (piece.toUpperCase() === 'P' && Math.abs(row(move.to) - row(move.from)) === 2) {
    ep = ((row(move.from) + row(move.to)) / 2) * 8 + col(move.from)
  }

  return { board, turn: state.turn === 'w' ? 'b' : 'w', castling, ep }
}

/** All fully legal moves for the side to move. */
export function legalMoves(state: ChessState): ChessMove[] {
  return pseudoMoves(state, state.turn)
    .filter((move) => !inCheck({ ...applyMove(state, move), turn: state.turn }, state.turn))
}

export type GameOver = 'checkmate' | 'stalemate' | null

export function gameOver(state: ChessState): GameOver {
  if (legalMoves(state).length) return null
  return inCheck(state, state.turn) ? 'checkmate' : 'stalemate'
}

// ---- the house AI: shallow alpha-beta over material + placement ----

const VALUE: Record<string, number> = { P: 100, N: 305, B: 320, R: 500, Q: 900, K: 0 }

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

export const squareName = (i: number) => `${'abcdefgh'[col(i)]}${8 - row(i)}`

export const PIECE_GLYPHS: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
}
