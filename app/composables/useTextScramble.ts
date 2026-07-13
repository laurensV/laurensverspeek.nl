// hover effect: characters cycle through glyphs and "decode" into the label.
// ASCII-only set: exotic glyphs can fall back to a non-mono font and shift widths.
const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&'

/**
 * One animation frame of the decode effect: everything before the settled
 * point shows the real character, the rest is random glyph noise. Pure —
 * inject `rng` to make it deterministic in tests.
 */
export function scrambleFrame(text: string, frame: number, totalFrames: number, rng: () => number = Math.random): string {
  const settled = Math.floor((frame / totalFrames) * text.length)
  return [...text]
    .map((ch, i) =>
      i < settled || ch === ' ' ? ch : GLYPHS[Math.floor(rng() * GLYPHS.length)]
    )
    .join('')
}

/** Drives the decode animation on an element's textContent (used by nav links). */
export function useTextScramble() {
  const timers = new Map<HTMLElement, ReturnType<typeof setInterval>>()

  // a mid-animation unmount must not leave intervals writing to detached nodes
  onScopeDispose(() => {
    timers.forEach((timer) => clearInterval(timer))
    timers.clear()
  })

  const scramble = (el: HTMLElement, text: string) => {
    const existing = timers.get(el)
    if (existing) clearInterval(existing)

    // Lock the box so wider glyphs can never reflow the page. Width keeps a nav
    // link from shoving its neighbours; height + overflow keep a heading that's
    // near the edge of a line from briefly wrapping to a second line and back
    // (its final text is preserved in aria-label, so this is purely visual).
    const rect = el.getBoundingClientRect()
    el.style.width = `${rect.width}px`
    el.style.height = `${rect.height}px`
    el.style.display = 'inline-block'
    el.style.overflow = 'hidden'

    let frame = 0
    const totalFrames = text.length * 2 + 4
    const timer = setInterval(() => {
      frame++
      el.textContent = scrambleFrame(text, frame, totalFrames)
      if (frame >= totalFrames) {
        el.textContent = text
        el.style.width = ''
        el.style.height = ''
        el.style.display = ''
        el.style.overflow = ''
        clearInterval(timer)
        timers.delete(el)
      }
    }, 28)
    timers.set(el, timer)
  }

  return { scramble }
}
