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

// g-chord navigation targets: g then one of these keys jumps to the page
const GO_TARGETS: Record<string, string> = {
  h: '/',
  b: '/blog',
  p: '/projects'
}

/**
 * Vim-style page scrolling: j/k scroll, gg jumps to the top, G to the bottom,
 * and go-to chords (gh → home, gb → blog, gp → projects) navigate.
 * Mounted once in the default layout; stays out of the way of form fields and
 * open overlays (terminal, palette, shortcuts — anything aria-modal).
 */
export function useVimScroll() {
  let lastG = 0
  // which-key style hint: the status bar shows "g-" while a chord is pending
  const pendingKey = useState(STATE_KEYS.vimPendingKey, () => '')
  let pendingTimer: ReturnType<typeof setTimeout> | undefined
  const setPending = () => {
    pendingKey.value = 'g'
    clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => (pendingKey.value = ''), 500)
  }
  const clearPending = () => {
    clearTimeout(pendingTimer)
    pendingKey.value = ''
  }

  const behavior = (): ScrollBehavior =>
    prefersReducedMotion() ? 'auto' : 'smooth'

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

  const router = useRouter()

  onKeyStroke('g', (event) => {
    if (!allowed(event)) return
    const now = Date.now()
    if (now - lastG < 500) {
      event.preventDefault()
      lastG = 0
      clearPending()
      window.scrollTo({ top: 0, behavior: behavior() })
      return
    }
    lastG = now
    setPending()
  })

  // go-to chords: a pending g followed by a target key navigates
  onKeyStroke(Object.keys(GO_TARGETS), (event) => {
    if (!allowed(event)) return
    if (Date.now() - lastG >= 500) return
    event.preventDefault()
    lastG = 0
    clearPending()
    void router.push(GO_TARGETS[event.key]!)
  })

  onKeyStroke('G', (event) => {
    if (!allowed(event)) return
    event.preventDefault()
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: behavior() })
  })
}
