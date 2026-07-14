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

    // Render the scramble in a MONOSPACE font so every random glyph has the same
    // advance width — no per-frame jiggle from proportional glyph widths. The box
    // is locked to the final text's footprint and overflow clipped. Whitespace is
    // the key: the random glyphs (`{}#%&…`) are wider than the resolved letters,
    // so on a single-line heading we force `nowrap` (the extra width clips at the
    // edge instead of wrapping to a clipped second line, which was the old "white
    // flicker" blanking); a heading whose FINAL text genuinely wraps keeps
    // `normal`, and monospace keeps that wrapping identical on every frame. Only
    // *inline* elements (nav links) need promoting to inline-block. The real text
    // lives in aria-label, so all of this is purely visual.
    const rect = el.getBoundingClientRect()
    const styles = getComputedStyle(el)
    const fontSize = parseFloat(styles.fontSize) || 16
    const singleLine = rect.height < fontSize * 1.8
    const wasInline = styles.display === 'inline'
    const prev = { width: el.style.width, height: el.style.height, overflow: el.style.overflow, whiteSpace: el.style.whiteSpace, fontFamily: el.style.fontFamily, display: el.style.display }
    el.style.width = `${rect.width}px`
    el.style.height = `${rect.height}px`
    el.style.overflow = 'hidden'
    el.style.whiteSpace = singleLine ? 'nowrap' : 'normal'
    el.style.fontFamily = "'JetBrains Mono', ui-monospace, 'Courier New', monospace"
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
        el.style.fontFamily = prev.fontFamily
        el.style.display = prev.display
        clearInterval(timer)
        timers.delete(el)
      }
    }, 28)
    timers.set(el, timer)
  }

  return { scramble }
}
