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
  // combined OS + site "reduce motion" — reactive, so a mid-session toggle counts
  const reducedMotion = useReducedMotion()

  // a mid-animation unmount must not leave intervals writing to detached nodes
  onScopeDispose(() => {
    timers.forEach((timer) => clearInterval(timer))
    timers.clear()
  })

  const scramble = (el: HTMLElement, text: string) => {
    const existing = timers.get(el)
    if (existing) clearInterval(existing)

    // reduced motion (OS or the site switch): no animation, just the final text
    if (reducedMotion.value) {
      el.textContent = text
      return
    }

    // Lock the box so the animation is pixel-stable. The random glyphs
    // (`{}#%&…`) are WIDER than the resolved letters in a proportional heading
    // font, so at the same character count the scrambled string is wider than the
    // final text. Pinning the width without `nowrap` made that wider string WRAP
    // onto a second line, which the locked height + `overflow:hidden` then clipped
    // — so the right half of the heading blanked out and popped back as it settled
    // (the "white flicker"). `nowrap` keeps it on one line (the few extra-wide
    // glyphs just clip at the edge instead of blanking a whole line). We only
    // promote *inline* elements (nav links, which ignore width) to inline-block;
    // block headings already honour width. The real text lives in aria-label.
    const rect = el.getBoundingClientRect()
        const wasInline = getComputedStyle(el).display === 'inline'
    const prev = { width: el.style.width, height: el.style.height, overflow: el.style.overflow, whiteSpace: el.style.whiteSpace, display: el.style.display }
    el.style.width = `${rect.width}px`
    el.style.height = `${rect.height}px`
    el.style.overflow = 'hidden'
    el.style.whiteSpace = 'nowrap'
    if (wasInline) el.style.display = 'inline-block'

    let frame = 0
    const totalFrames = text.length * 2 + 4
    const timer = setInterval(() => {
      frame++
      el.textContent = scrambleFrame(text, frame, totalFrames)
      if (frame >= totalFrames) {
        el.textContent = text
        el.style.width = prev.width
        el.style.height = prev.height
        el.style.overflow = prev.overflow
        el.style.whiteSpace = prev.whiteSpace
        el.style.display = prev.display
        clearInterval(timer)
        timers.delete(el)
      }
    }, 28)
    timers.set(el, timer)
  }

  return { scramble }
}
