// Register the leaderboard score-sink site-wide (only when a relay is built in),
// so a finished terminal game submits its score even if the Scores app was
// never opened. No-ops entirely when NUXT_PUBLIC_CURSORS_WS is unset.
export default defineNuxtPlugin(() => {
  const leaderboard = useLeaderboard()
  if (leaderboard.enabled.value) leaderboard.enter()
})
