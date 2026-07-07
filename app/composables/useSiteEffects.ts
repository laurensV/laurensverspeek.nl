/** Site-wide visual easter-egg effects, toggled from the terminal. */
export function useSiteEffects() {
  const matrixActive = useState('fx-matrix', () => false)
  const crtActive = useState('fx-crt', () => false)
  const desktopActive = useState('fx-desktop', () => false)

  const toggleCrt = (on?: boolean) => {
    crtActive.value = on ?? !crtActive.value
    if (import.meta.client) {
      document.documentElement.classList.toggle('crt-mode', crtActive.value)
    }
    return crtActive.value
  }

  return { matrixActive, crtActive, desktopActive, toggleCrt }
}
