// The relay's wire contract, in one place. The Nuxt client composables
// (useWorld / useLeaderboard / LiveCursors) and the checkJs relay server
// (cursors-server.mjs) both type their sends and message handlers against
// these shapes, so a protocol change that only lands on one side fails the
// typecheck instead of failing quietly at runtime.

import type { ScoreEntry, ScoreBoards } from './scores-core.mjs'
import type { ChessMove } from './chess-core.mjs'
export type { ScoreEntry, ScoreBoards }

// ---- client → server ----

/** Viewport-relative cursor position; the one legacy frame with no `type`.
 * `tz` is the sender's UTC offset in minutes (for the visitor globe). */
export interface CursorMoveIn { type?: undefined, x: number, y: number, page: string, name?: string, tz?: number }
export interface SayIn { type: 'say', text: string }
export interface ScoresGetIn { type: 'scores-get' }
export interface ScoreSubmitIn { type: 'score-submit', game: string, score: number, name?: string }
export interface WorldJoinIn { type: 'world-join' }
export interface WorldLeaveIn { type: 'world-leave' }
export interface PixelIn { type: 'pixel', x: number, y: number, c: number, name?: string }
export interface WorldWhoIn { type: 'world-who', x: number, y: number }
export interface WorldCursorIn { type: 'world-cursor', x: number, y: number }

export interface PongJoinIn { type: 'pong-join', name?: string }
export interface PongLeaveIn { type: 'pong-leave' }
export interface PongMoveIn { type: 'pong-move', y: number }

export interface ChatJoinIn { type: 'chat-join' }
export interface ChatLeaveIn { type: 'chat-leave' }
export interface ChatSendIn { type: 'chat-send', text: string, name?: string }

export interface ChessJoinIn { type: 'chess-join', name?: string }
export interface ChessLeaveIn { type: 'chess-leave' }
/** A move intent: from/to squares only — the server derives promo/castle/ep
 * from its own legal-move list and never trusts the rest. */
export interface ChessMoveIn { type: 'chess-move', from: number, to: number }

export interface DrawJoinIn { type: 'draw-join' }
export interface DrawLeaveIn { type: 'draw-leave' }
/** One freehand line segment, endpoints in normalized [0,1] space, `c` a pen
 * index into DRAW_COLORS. The server sanitizes/clamps before storing. */
export interface DrawStrokeIn { type: 'draw-stroke', x0: number, y0: number, x1: number, y1: number, c: number }
export interface DrawClearIn { type: 'draw-clear' }

export interface RaceJoinIn { type: 'race-join', name?: string }
export interface RaceLeaveIn { type: 'race-leave' }
/** How many leading characters of the passage this player has typed correctly.
 * The server validates monotonicity and range; the finish is server-declared. */
export interface RaceProgressIn { type: 'race-progress', chars: number }

export type ClientMessage =
  | CursorMoveIn
  | SayIn
  | ScoresGetIn
  | ScoreSubmitIn
  | WorldJoinIn
  | WorldLeaveIn
  | PixelIn
  | WorldWhoIn
  | WorldCursorIn
  | PongJoinIn
  | PongLeaveIn
  | PongMoveIn
  | ChatJoinIn
  | ChatLeaveIn
  | ChatSendIn
  | ChessJoinIn
  | ChessLeaveIn
  | ChessMoveIn
  | RaceJoinIn
  | RaceLeaveIn
  | RaceProgressIn
  | DrawJoinIn
  | DrawLeaveIn
  | DrawStrokeIn
  | DrawClearIn

// ---- server → client ----

export interface HelloMsg { type: 'hello', id: number, hue: number }
export interface MoveMsg { type: 'move', id: number, hue: number, name: string, x: number, y: number, page: string, tz: number }
export interface LeaveMsg { type: 'leave', id: number }
export interface SayMsg { type: 'say', id: number, text: string }

export interface ScoresMsg { type: 'scores', boards: ScoreBoards }
export interface ScoreBoardMsg { type: 'score-board', game: string, board: ScoreEntry[] }

export interface WorldStateMsg {
  type: 'world-state'
  size: number
  cooldownMs: number
  /** base64-encoded board (see world-core encodeBoard/decodeBoard) */
  board: string
  history: { x: number, y: number, c: number, at: number }[]
}
export interface PixelMsg { type: 'pixel', x: number, y: number, c: number, by: string, at: number }
export interface WorldCountMsg { type: 'world-count', online: number, recent: number }
export interface PixelDeniedMsg { type: 'pixel-denied', waitMs: number }
export interface PixelInfoMsg { type: 'pixel-info', x: number, y: number, by: string | null, at: number | null }
export interface WorldCursorMsg { type: 'world-cursor', id: number, hue: number, x: number, y: number }

/** What the page-cursor overlay (LiveCursors) consumes. */
export type CursorsServerMessage = HelloMsg | MoveMsg | LeaveMsg | SayMsg
/** What the pixel-world client consumes. */
export type WorldServerMessage =
  | WorldStateMsg
  | PixelMsg
  | WorldCountMsg
  | PixelDeniedMsg
  | PixelInfoMsg
  | WorldCursorMsg
  | LeaveMsg
/** What the leaderboard client consumes. */
export type ScoresServerMessage = ScoresMsg | ScoreBoardMsg

export interface PongWaitMsg { type: 'pong-wait' }
export interface PongStartMsg { type: 'pong-start', side: 'l' | 'r', foe: string }
export interface PongStateMsg {
  type: 'pong-state'
  bx: number
  by: number
  ly: number
  ry: number
  ls: number
  rs: number
}
export interface PongEndMsg { type: 'pong-end', winner: 'l' | 'r', forfeit?: boolean }
/** What the online-pong client consumes. */
export type PongServerMessage = PongWaitMsg | PongStartMsg | PongStateMsg | PongEndMsg

/** One chat-room line. Ephemeral: the relay keeps only a short ring buffer. */
export interface ChatMessage { name: string, text: string, at: number }
export interface ChatStateMsg { type: 'chat-state', messages: ChatMessage[], online: number }
export interface ChatMsgMsg { type: 'chat-msg', name: string, text: string, at: number }
export interface ChatCountMsg { type: 'chat-count', online: number }
/** What the chat-room clients (terminal command + lvOS app) consume. */
export type ChatServerMessage = ChatStateMsg | ChatMsgMsg | ChatCountMsg

export interface ChessWaitMsg { type: 'chess-wait' }
export interface ChessStartMsg { type: 'chess-start', side: 'w' | 'b', foe: string }
/** The server's applied, validated move — both clients replay it locally
 * through the same chess-core, so the boards can never diverge. */
export interface ChessMovedMsg { type: 'chess-moved', move: ChessMove }
export interface ChessEndMsg {
  type: 'chess-end'
  winner: 'w' | 'b' | null
  reason: 'checkmate' | 'stalemate' | 'forfeit'
}
/** What the online-chess client consumes. */
export type ChessServerMessage = ChessWaitMsg | ChessStartMsg | ChessMovedMsg | ChessEndMsg

export interface RaceWaitMsg { type: 'race-wait' }
/** Both racers get the SAME passage; typing counts only after race-go. */
export interface RaceStartMsg { type: 'race-start', foe: string, text: string }
export interface RaceGoMsg { type: 'race-go' }
/** The opponent's validated progress (leading correct characters). */
export interface RaceFoeMsg { type: 'race-foe', chars: number }
export interface RaceEndMsg { type: 'race-end', youWon: boolean, forfeit?: boolean }
/** What the wpm-race client consumes. */
export type RaceServerMessage = RaceWaitMsg | RaceStartMsg | RaceGoMsg | RaceFoeMsg | RaceEndMsg

/** One whiteboard segment as stored/broadcast. */
export interface DrawStroke { x0: number, y0: number, x1: number, y1: number, c: number }
export interface DrawStateMsg { type: 'draw-state', strokes: DrawStroke[], online: number }
export interface DrawStrokeMsg { type: 'draw-stroke', x0: number, y0: number, x1: number, y1: number, c: number }
export interface DrawClearMsg { type: 'draw-clear' }
export interface DrawCountMsg { type: 'draw-count', online: number }
/** What the co-draw whiteboard client consumes. */
export type DrawServerMessage = DrawStateMsg | DrawStrokeMsg | DrawClearMsg | DrawCountMsg

export type ServerMessage = CursorsServerMessage | WorldServerMessage | ScoresServerMessage | PongServerMessage | ChessServerMessage | ChatServerMessage | RaceServerMessage | DrawServerMessage
