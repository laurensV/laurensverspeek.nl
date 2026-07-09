/** Site-wide visual easter-egg effects, toggled from the terminal. */
export function useSiteEffects() {
  const matrixActive = useState('fx-matrix', () => false)
  const crtActive = useState('fx-crt', () => false)
  const destructActive = useState('fx-destruct', () => false)

  const toggleCrt = (on?: boolean) => {
    crtActive.value = on ?? !crtActive.value
    if (import.meta.client) {
      document.documentElement.classList.toggle('crt-mode', crtActive.value)
    }
    return crtActive.value
  }

  return { matrixActive, crtActive, destructActive, toggleCrt }
}
