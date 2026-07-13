/**
 * Decide what a "new personal best" celebration should do to the shared
 * celebrate/worldRecord flags.
 *
 * A plain personal best is never a world record, so triggering one must clear
 * any lingering `worldRecord` flag first — otherwise a confetti burst that fires
 * inside the world-record toast's 4.2s lifetime would read the stale flag and
 * play the big/long variant meant only for a real record. But when a
 * world-record celebration already owns this tick (the leaderboard set
 * `celebrateActive` a moment earlier, before this personal-best sink runs), we
 * must leave its flags untouched so the big burst and the toast survive.
 */
export function planPersonalBest(celebrateActive: boolean): { trigger: boolean, clearWorldRecord: boolean } {
  if (celebrateActive) return { trigger: false, clearWorldRecord: false }
  return { trigger: true, clearWorldRecord: true }
}
