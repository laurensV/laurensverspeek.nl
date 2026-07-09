// Toggle dark/light with a circular reveal: the outgoing theme's colour
// collapses into the click point, uncovering the new theme underneath. Built
// with a plain overlay + Web Animations (not View Transitions) so it doesn't
// fight the site's route transitions or color-mode's async DOM updates. Falls
// back to an instant switch when reduced motion is requested.

export function useThemeSwitch() {
  const colorMode = useColorMode()

  const apply = (next: 'dark' | 'light', event?: MouseEvent) => {
    if (!import.meta.client) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canAnimate = typeof Element !== 'undefined' && 'animate' in Element.prototype

    if (reduce || !canAnimate) {
      colorMode.preference = next
      return
    }

    // snapshot the current background, then flip the theme underneath
    const oldBg = getComputedStyle(document.body).backgroundColor
    colorMode.preference = next

    const x = event?.clientX ?? window.innerWidth / 2
    const y = event?.clientY ?? window.innerHeight / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    const overlay = document.createElement('div')
    overlay.className = 'theme-reveal'
    overlay.style.cssText = `position:fixed;inset:0;z-index:9998;pointer-events:none;background:${oldBg}`
    document.body.appendChild(overlay)
    overlay
      .animate(
        { clipPath: [`circle(${radius}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`] },
        { duration: 450, easing: 'ease-in-out' }
      )
      .finished.catch(() => {})
      .finally(() => overlay.remove())
  }

  /** Flip to the opposite of the current resolved theme. */
  const toggle = (event?: MouseEvent) => apply(colorMode.value === 'dark' ? 'light' : 'dark', event)

  return { toggle, apply }
}
