import { storageGet } from '~/utils/safeStorage'

export interface HallEntry {
  /** display name */
  game: string
  /** localStorage key the game writes its best to */
  key: string
  /** what the number means */
  unit: string
}

// Every local personal-best the site tracks, in one place, so the lvOS Scores
// app and the terminal `scores` command render the SAME hall of fame instead of
// each keeping its own list. The games write these keys; this reads them.
export const HALL_OF_FAME: HallEntry[] = [
  { game: 'snake', key: 'lv-snake-highscore', unit: 'points' },
  { game: 'asteroids', key: 'lv-asteroids-highscore', unit: 'points' },
  { game: 'tetris', key: 'lv-tetris-highscore', unit: 'points' },
  { game: '2048', key: 'lv-2048-highscore', unit: 'points' },
  { game: 'typing test', key: 'lv-wpm-highscore', unit: 'wpm' },
  { game: 'pong', key: 'lv-pong-highscore', unit: 'rally hits' },
  { game: 'minesweeper · beginner', key: 'lvos-mines-best-beginner', unit: 'seconds' },
  { game: 'minesweeper · intermediate', key: 'lvos-mines-best-intermediate', unit: 'seconds' },
  { game: 'minesweeper · expert', key: 'lvos-mines-best-expert', unit: 'seconds' },
  { game: 'pong online', key: 'lv-pong-online-wins', unit: 'duels won' },
  { game: 'chess · vs house', key: 'lv-chess-ai-wins', unit: 'wins' },
  { game: 'chess online', key: 'lv-chess-online-wins', unit: 'duels won' },
  { game: 'typing race', key: 'lv-wpm-race-wins', unit: 'races won' }
]

/** A stored best, or null when there's no genuine entry yet. */
export function readBest(key: string): number | null {
  const value = Number(storageGet(key))
  return Number.isFinite(value) && value > 0 ? value : null
}
