// Shared building blocks for the terminal games. Each game still owns its own
// render + update logic; the kit removes the boilerplate they all repeated:
// high-score persistence, the game-over score summary, and the tick timer.

import { storageGet, storageSet } from '~/utils/safeStorage'

/** A high score backed by localStorage under a single key. */
export function useHighScore(key: string) {
  const get = () => Number(storageGet(key) ?? 0) || 0

  /** Record a score; returns whether it was a new best and the best so far. */
  const record = (score: number) => {
    const best = get()
    if (score > best) {
      storageSet(key, String(score))
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
