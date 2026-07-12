// The chess RULES, shared verbatim by the lvOS chess app and the relay server
// (like world-core/pong-core): full legal moves (castling, promotion, en
// passant), check/checkmate/stalemate. The relay validates online-match moves
// with the exact code the client plays by, so the two can never disagree.
// Board: 64 cells, row-major from a8 (index 0) to h1 (index 63); FEN-style
// piece letters, uppercase white. The client-only AI lives in app/utils/chess.ts.

/** @typedef {'P'|'N'|'B'|'R'|'Q'|'K'|'p'|'n'|'b'|'r'|'q'|'k'|''} Piece */
/** @typedef {'w'|'b'} Side */
/**
 * @typedef {object} ChessMove
 * @property {number} from
 * @property {number} to
 * @property {Piece} [promo] promotion piece (always queen for the app)
 * @property {{ from: number, to: number }} [castle] rook's from/to when castling
 * @property {number} [ep] captured pawn's square for en passant
 */
/**
 * @typedef {object} ChessState
 * @property {Piece[]} board
 * @property {Side} turn
 * @property {{ wK: boolean, wQ: boolean, bK: boolean, bQ: boolean }} castling
 * @property {number | null} ep square a pawn just double-stepped over, or null
 */

export const START_FEN_ROWS = ['rnbqkbnr', 'pppppppp', '', '', '', '', 'PPPPPPPP', 'RNBQKBNR']

/** @returns {ChessState} */
export function initialState() {
  const board = /** @type {Piece[]} */ (Array.from({ length: 64 }, () => ''))
  START_FEN_ROWS.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) board[r * 8 + c] = /** @type {Piece} */ (row[c])
  })
  return { board, turn: 'w', castling: { wK: true, wQ: true, bK: true, bQ: true }, ep: null }
}

/** @param {Piece} piece @returns {Side | null} */
export const sideOf = (piece) =>
  piece === '' ? null : piece === piece.toUpperCase() ? 'w' : 'b'

/** @param {number} i */
const row = (i) => Math.floor(i / 8)
/** @param {number} i */
const col = (i) => i % 8
/** @param {number} r @param {number} c */
const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8

/** @type {Record<string, [number, number][]>} */
const RAYS = {
  B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  Q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
}
/** @type {[number, number][]} */
const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
const QUEEN_RAYS = /** @type {[number, number][]} */ (RAYS.Q)

/** All pseudo-legal moves for `side` (may leave own king in check).
 * @param {ChessState} state @param {Side} side @returns {ChessMove[]} */
export function pseudoMoves(state, side) {
  const { board } = state
  /** @type {ChessMove[]} */
  const moves = []
  /** @param {number} from @param {number} to @param {Partial<ChessMove>} [extra] */
  const push = (from, to, extra = {}) => {
    moves.push({ from, to, ...extra })
  }

  for (let i = 0; i < 64; i++) {
    const piece = /** @type {Piece} */ (board[i])
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
        const victim = /** @type {Piece} */ (board[target])
        if (victim && sideOf(victim) !== side) {
          push(i, target, r + dir === promoRow ? { promo: (side === 'w' ? 'Q' : 'q') } : {})
        } else if (state.ep === target && !victim) {
          push(i, target, { ep: r * 8 + c + dc })
        }
      }
    } else if (kind === 'N' || kind === 'K') {
      const steps = kind === 'N' ? KNIGHT : QUEEN_RAYS
      for (const [dr, dc] of steps) {
        if (!on(r + dr, c + dc)) continue
        const target = (r + dr) * 8 + c + dc
        if (sideOf(/** @type {Piece} */ (board[target])) !== side) push(i, target)
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
      const rays = /** @type {[number, number][]} */ (RAYS[kind])
      for (const [dr, dc] of rays) {
        let rr = r + dr
        let cc = c + dc
        while (on(rr, cc)) {
          const target = rr * 8 + cc
          const victim = /** @type {Piece} */ (board[target])
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

/** Is `square` attacked by the opponent of `side`?
 * @param {ChessState} state @param {number} square @param {Side} side */
export function attacked(state, square, side) {
  /** @type {Side} */
  const foe = side === 'w' ? 'b' : 'w'
  const { board } = state
  const r = row(square)
  const c = col(square)
  // pawns
  const dir = foe === 'w' ? 1 : -1 // squares a foe pawn would attack FROM
  for (const dc of [-1, 1]) {
    if (!on(r + dir, c + dc)) continue
    const piece = /** @type {Piece} */ (board[(r + dir) * 8 + c + dc])
    if (piece.toUpperCase() === 'P' && sideOf(piece) === foe) return true
  }
  // knights
  for (const [dr, dc] of KNIGHT) {
    if (!on(r + dr, c + dc)) continue
    const piece = /** @type {Piece} */ (board[(r + dr) * 8 + c + dc])
    if (piece.toUpperCase() === 'N' && sideOf(piece) === foe) return true
  }
  // king adjacency
  for (const [dr, dc] of QUEEN_RAYS) {
    if (!on(r + dr, c + dc)) continue
    const piece = /** @type {Piece} */ (board[(r + dr) * 8 + c + dc])
    if (piece.toUpperCase() === 'K' && sideOf(piece) === foe) return true
  }
  // sliders
  for (const [dr, dc] of QUEEN_RAYS) {
    let rr = r + dr
    let cc = c + dc
    while (on(rr, cc)) {
      const piece = /** @type {Piece} */ (board[rr * 8 + cc])
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

/** @param {Piece[]} board @param {Side} side */
export function kingSquare(board, side) {
  const king = side === 'w' ? 'K' : 'k'
  return board.indexOf(king)
}

/** @param {ChessState} state @param {Side} side */
export function inCheck(state, side) {
  return attacked(state, kingSquare(state.board, side), side)
}

/** Apply a move, returning the next state (input untouched).
 * @param {ChessState} state @param {ChessMove} move @returns {ChessState} */
export function applyMove(state, move) {
  const board = [...state.board]
  const piece = /** @type {Piece} */ (board[move.from])
  board[move.to] = move.promo ?? piece
  board[move.from] = ''
  if (move.castle) {
    board[move.castle.to] = /** @type {Piece} */ (board[move.castle.from])
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

  /** @type {number | null} */
  let ep = null
  if (piece.toUpperCase() === 'P' && Math.abs(row(move.to) - row(move.from)) === 2) {
    ep = ((row(move.from) + row(move.to)) / 2) * 8 + col(move.from)
  }

  return { board, turn: state.turn === 'w' ? 'b' : 'w', castling, ep }
}

/** All fully legal moves for the side to move.
 * @param {ChessState} state @returns {ChessMove[]} */
export function legalMoves(state) {
  return pseudoMoves(state, state.turn)
    .filter((move) => !inCheck({ ...applyMove(state, move), turn: state.turn }, state.turn))
}

/** @typedef {'checkmate' | 'stalemate' | null} GameOver */

/** @param {ChessState} state @returns {GameOver} */
export function gameOver(state) {
  if (legalMoves(state).length) return null
  return inCheck(state, state.turn) ? 'checkmate' : 'stalemate'
}

/** @param {number} i */
export const squareName = (i) => `${'abcdefgh'[col(i)]}${8 - row(i)}`
