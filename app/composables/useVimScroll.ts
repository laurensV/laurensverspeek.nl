import { onKeyStroke } from '@vueuse/core'

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false
  return (
    el instanceof HTMLInputElement
    || el instanceof HTMLTextAreaElement
    || el instanceof HTMLSelectElement
    || el.isContentEditable
  )
}

/**
 * Vim-style page scrolling: j/k scroll, gg jumps to the top, G to the bottom.
 * Mounted once in the default layout; stays out of the way of form fields and
 * open overlays (terminal, palette, shortcuts — anything aria-modal).
 */
export function useVimScroll() {
  let lastG = 0

  const behavior = (): ScrollBehavior =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

  const allowed = (event: KeyboardEvent): boolean => {
    if (event.ctrlKey || event.metaKey || event.altKey) return false
    if (isTypingTarget(event.target)) return false
    if (document.querySelector('[aria-modal="true"]')) return false
    return true
  }

  onKeyStroke(['j', 'k'], (event) => {
    if (!allowed(event)) return
    event.preventDefault()
    window.scrollBy({ top: event.key === 'j' ? 90 : -90, behavior: behavior() })
  })

  onKeyStroke('g', (event) => {
    if (!allowed(event)) return
    const now = Date.now()
    if (now - lastG < 500) {
      event.preventDefault()
      lastG = 0
      window.scrollTo({ top: 0, behavior: behavior() })
      return
    }
    lastG = now
  })

  onKeyStroke('G', (event) => {
    if (!allowed(event)) return
    event.preventDefault()
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: behavior() })
  })
}
