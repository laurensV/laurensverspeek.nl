// Shared, dependency-free logic for the game leaderboard, imported by BOTH the
// relay server and the client (like world-core). All validation lives here so
// the server can trust nothing from the wire: game id, score range and name are
// all checked, and only the top N per game are kept.

/**
 * @typedef {{ name: string, score: number, at: number }} ScoreEntry
 * @typedef {Record<string, ScoreEntry[]>} ScoreBoards
 */

/** @type {string[]} The games that keep a high score (match the client keys). */
export const LEADERBOARD_GAMES = ['snake', 'tetris', '2048', 'wpm']

export const MAX_SCORES = 10
// a generous but finite cap per game, so a hostile client can't submit Infinity
const SCORE_CAP = {
  snake: 100000,
  tetris: 9999999,
  2048: 10000000,
  wpm: 400
}

/** Sanitize a display name to the same shell-safe handle the cursors use.
 * @param {unknown} raw @returns {string} */
export const cleanName = (raw) =>
  (typeof raw === 'string' ? raw : '')
    .toLowerCase().replace(/[^a-z0-9_-]+/g, '').slice(0, 24) || 'anon'

/** True when a submission is a well-formed, in-range score for a known game.
 * @param {unknown} msg @returns {boolean} */
export function validSubmission(msg) {
  if (!msg || typeof msg !== 'object') return false
  const { game, score } = /** @type {{ game?: unknown, score?: unknown }} */ (msg)
  if (typeof game !== 'string' || !LEADERBOARD_GAMES.includes(game)) return false
  if (typeof score !== 'number' || !Number.isFinite(score)) return false
  const cap = /** @type {Record<string, number>} */ (SCORE_CAP)[game] ?? 0
  if (score < 0 || score > cap) return false
  return Number.isInteger(score)
}

/**
 * Insert `entry` into a game's sorted-desc board, keeping the top `max`.
 * Pure: returns a new array. Higher is better for every game.
 * @param {ScoreEntry[]} board @param {ScoreEntry} entry @param {number} max
 * @returns {ScoreEntry[]}
 */
export function addScore(board, entry, max = MAX_SCORES) {
  const next = [...(board ?? []), entry].sort((a, b) => b.score - a.score)
  return next.slice(0, max)
}

/** An empty board: one score list per game. @returns {ScoreBoards} */
export function emptyBoards() {
  return /** @type {ScoreBoards} */ (Object.fromEntries(LEADERBOARD_GAMES.map((game) => [game, []])))
}
