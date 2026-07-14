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

    // Lock the box so wider glyphs can never reflow the page: every frame has the
    // same character count (spaces preserved), so pinning the exact width+height
    // and clipping overflow keeps the footprint — and the line count — identical
    // to the final text. Crucially we only promote *inline* elements (nav links,
    // which ignore width) to inline-block; a block heading already honours width,
    // and forcing it to inline-block shifted it onto the text baseline and, with
    // the height clip, made it visibly jump and flash. The real text lives in
    // aria-label, so all of this is purely visual.
    const rect = el.getBoundingClientRect()
    const wasInline = getComputedStyle(el).display === 'inline'
    const prev = { width: el.style.width, height: el.style.height, overflow: el.style.overflow, display: el.style.display }
    el.style.width = `${rect.width}px`
    el.style.height = `${rect.height}px`
    el.style.overflow = 'hidden'
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
        el.style.display = prev.display
        clearInterval(timer)
        timers.delete(el)
      }
    }, 28)
    timers.set(el, timer)
  }

  return { scramble }
}
