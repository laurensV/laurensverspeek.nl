/** Site-wide visual easter-egg effects, toggled from the terminal. */
export function useSiteEffects() {
  const matrixActive = useState(STATE_KEYS.fxMatrix, () => false)
  const crtActive = useState(STATE_KEYS.fxCrt, () => false)
  const destructActive = useState(STATE_KEYS.fxDestruct, () => false)
  const fireworksActive = useState(STATE_KEYS.fxFireworks, () => false)
  // a brief confetti burst when a game beats a personal best
  const celebrateActive = useState(STATE_KEYS.fxCelebrate, () => false)
  // the game name when you beat the GLOBAL leaderboard #1 — a bigger burst + a
  // "new world record" banner ride on this; '' when there's nothing to crow about
  const worldRecord = useState(STATE_KEYS.fxWorldRecord, () => '')

  const toggleCrt = (on?: boolean) => {
    crtActive.value = on ?? !crtActive.value
    if (import.meta.client) {
      document.documentElement.classList.toggle('crt-mode', crtActive.value)
    }
    return crtActive.value
  }

  return { matrixActive, crtActive, destructActive, fireworksActive, celebrateActive, worldRecord, toggleCrt }
}
