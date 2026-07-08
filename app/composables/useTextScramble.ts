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
  const timers = new WeakMap<HTMLElement, ReturnType<typeof setInterval>>()

  const scramble = (el: HTMLElement, text: string) => {
    const existing = timers.get(el)
    if (existing) clearInterval(existing)

    // lock the current width so random glyphs can never shift the layout
    el.style.width = `${el.getBoundingClientRect().width}px`
    el.style.display = 'inline-block'

    let frame = 0
    const totalFrames = text.length * 2 + 4
    const timer = setInterval(() => {
      frame++
      el.textContent = scrambleFrame(text, frame, totalFrames)
      if (frame >= totalFrames) {
        el.textContent = text
        el.style.width = ''
        el.style.display = ''
        clearInterval(timer)
        timers.delete(el)
      }
    }, 28)
    timers.set(el, timer)
  }

  return { scramble }
}
