// The relay's wire contract, in one place. The Nuxt client composables
// (useWorld / useLeaderboard / LiveCursors) and the checkJs relay server
// (cursors-server.mjs) both type their sends and message handlers against
// these shapes, so a protocol change that only lands on one side fails the
// typecheck instead of failing quietly at runtime.

import type { ScoreEntry, ScoreBoards } from './scores-core.mjs'
export type { ScoreEntry, ScoreBoards }

// ---- client → server ----

/** Viewport-relative cursor position; the one legacy frame with no `type`. */
export interface CursorMoveIn { type?: undefined, x: number, y: number, page: string, name?: string }
export interface SayIn { type: 'say', text: string }
export interface ScoresGetIn { type: 'scores-get' }
export interface ScoreSubmitIn { type: 'score-submit', game: string, score: number, name?: string }
export interface WorldJoinIn { type: 'world-join' }
export interface WorldLeaveIn { type: 'world-leave' }
export interface PixelIn { type: 'pixel', x: number, y: number, c: number, name?: string }
export interface WorldWhoIn { type: 'world-who', x: number, y: number }
export interface WorldCursorIn { type: 'world-cursor', x: number, y: number }

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

// ---- server → client ----

export interface HelloMsg { type: 'hello', id: number, hue: number }
export interface MoveMsg { type: 'move', id: number, hue: number, name: string, x: number, y: number, page: string }
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

export type ServerMessage = CursorsServerMessage | WorldServerMessage | ScoresServerMessage
