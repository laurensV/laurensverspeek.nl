// Shared building blocks for the terminal games. Each game still owns its own
// render + update logic; the kit removes the boilerplate they all repeated:
// high-score persistence, the game-over score summary, and the tick timer.

import { storageGet, storageSet, storageRemove } from '~/utils/safeStorage'

// an optional sink the leaderboard composable registers, so a finished game's
// score can be submitted online without the pure games knowing about the relay
let scoreSink: ((game: string, score: number) => void) | null = null
export const setScoreSink = (fn: ((game: string, score: number) => void) | null) => { scoreSink = fn }

// an optional sink a client plugin registers, fired when a score beats a real
// prior best — flips the confetti-burst flag without the pure games importing Vue
let celebrateSink: (() => void) | null = null
export const setCelebrateSink = (fn: (() => void) | null) => { celebrateSink = fn }

/** Fire the shared high-score confetti burst directly — for a genuine new best
 * that a game tracks itself (e.g. minesweeper's lower-is-better time) rather
 * than through useHighScore, so every personal best celebrates the same way. */
export function celebrateNewBest() {
  celebrateSink?.()
}

/** Move a score stored under a legacy key to its current key, keeping the best. */
export function migrateScoreKey(oldKey: string, newKey: string) {
  const legacy = Number(storageGet(oldKey) ?? 0) || 0
  if (!legacy) return
  const current = Number(storageGet(newKey) ?? 0) || 0
  if (legacy > current) storageSet(newKey, String(legacy))
  storageRemove(oldKey)
}

/** A persisted counter (e.g. online duel wins); returns the new total. */
export function bumpTally(key: string): number {
  const next = (Number(storageGet(key) ?? 0) || 0) + 1
  storageSet(key, String(next))
  return next
}

/** A high score backed by localStorage under a single key. */
export function useHighScore(key: string) {
  const get = () => Number(storageGet(key) ?? 0) || 0

  /** Record a score; returns whether it was a new best and the best so far. */
  const record = (score: number) => {
    const best = get()
    // offer the achieved score to the leaderboard (the game id lives in the key)
    const game = /lv-([a-z0-9]+)-highscore/.exec(key)?.[1]
    if (game && scoreSink) scoreSink(game, score)
    if (score > best) {
      storageSet(key, String(score))
      // celebrate only a genuine improvement over an existing record, so the
      // very first play of a game doesn't set off confetti
      if (best > 0) celebrateSink?.()
      return { isNew: true, best }
    }
    return { isNew: false, best }
  }

  return { get, record }
}

/**
 * Standard game-over summary lines: a headline, the final score, and either a
 * "new high score" or "high score" line — the pattern snake/tetris/2048 share.
 */
export function finalScoreLines(key: string, score: number, opts: {
  headline: string
  scoreLabel?: string
} = { headline: 'game over' }): string[] {
  const { isNew, best } = useHighScore(key).record(score)
  const lines = [opts.headline, opts.scoreLabel ?? `final score: ${score}`]
  lines.push(isNew ? `new high score! previous best: ${best}` : `high score: ${best}`)
  return lines
}

/**
 * A repeating tick whose interval can change between ticks (used by tetris to
 * speed up gravity). Returns a stop() handle. Call start() to begin.
 */
export function createTicker(tick: () => void, intervalFor: () => number) {
  let handle: ReturnType<typeof setTimeout> | undefined
  let stopped = false

  const schedule = () => {
    handle = setTimeout(() => {
      if (stopped) return
      tick()
      schedule()
    }, intervalFor())
  }

  return {
    start: () => {
      stopped = false
      schedule()
    },
    stop: () => {
      stopped = true
      if (handle) clearTimeout(handle)
    }
  }
}

/** True for the keys that mean "quit this game" (q / Esc). */
export const isQuitKey = (key: string) => {
  const lower = key.toLowerCase()
  return lower === 'q' || lower === 'escape'
}
