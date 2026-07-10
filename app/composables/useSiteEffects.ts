/** Site-wide visual easter-egg effects, toggled from the terminal. */
export function useSiteEffects() {
  const matrixActive = useState(STATE_KEYS.fxMatrix, () => false)
  const crtActive = useState(STATE_KEYS.fxCrt, () => false)
  const destructActive = useState(STATE_KEYS.fxDestruct, () => false)
  const fireworksActive = useState(STATE_KEYS.fxFireworks, () => false)

  const toggleCrt = (on?: boolean) => {
    crtActive.value = on ?? !crtActive.value
    if (import.meta.client) {
      document.documentElement.classList.toggle('crt-mode', crtActive.value)
    }
    return crtActive.value
  }

  return { matrixActive, crtActive, destructActive, fireworksActive, toggleCrt }
}
