/**
 * Flash-highlight the element a #hash deep link points at, both on arrival
 * and when the hash changes in-page (e.g. clicking a heading anchor). The
 * highlight is a brief background wash — reduced motion gets a static one.
 */
export function useAnchorHighlight() {
  const route = useRoute()
  let clearTimer: ReturnType<typeof setTimeout> | undefined
  const retryTimers: ReturnType<typeof setTimeout>[] = []

  const flash = () => {
    const id = decodeURIComponent(route.hash.slice(1))
    if (!id) return
    const el = document.getElementById(id)
    if (!el) return
    el.classList.remove('is-anchor-target')
    // restart the animation even when re-targeting the same element
    void el.offsetWidth
    el.classList.add('is-anchor-target')
    clearTimeout(clearTimer)
    clearTimer = setTimeout(() => el.classList.remove('is-anchor-target'), 2000)
  }

  onMounted(() => {
    // content (blog bodies) renders async; try again once it likely exists —
    // track BOTH retries so a quick navigation clears them (no post-unmount flash)
    retryTimers.push(setTimeout(flash, 350), setTimeout(flash, 1400))
  })
  watch(() => route.hash, () => nextTick(flash))
  onUnmounted(() => {
    clearTimeout(clearTimer)
    retryTimers.forEach(clearTimeout)
  })
}
