import type { Ref } from 'vue'

/**
 * Treat a full-screen menu as a modal dialog: freeze the page behind it, move
 * focus inside, trap Tab, close on Escape, and restore focus to the trigger
 * when it closes (so keyboard/AT users aren't stranded).
 *
 * Locking with body position:fixed (not just overflow) is deliberate: on touch
 * browsers the page keeps scrolling underneath otherwise, dragging the sticky
 * navbar (and its close button) out of reach. The scroll offset is stashed and
 * restored on close.
 */
const FOCUSABLE = 'a[href], a[role], button, input, textarea, [tabindex]:not([tabindex="-1"])'

// Scroll locking is shared and reference-counted across every modal on the page
// (terminal, palette, mobile menu). Two overlapping modals would otherwise each
// stash their own scrollY and the inner one's unlock — running while the outer
// is still open — would clear the fixed styles and scroll to the wrong offset.
let lockCount = 0
let lockedScrollY = 0
const acquireScrollLock = () => {
  if (lockCount++ === 0) {
    lockedScrollY = window.scrollY
    const { style } = document.body
    style.position = 'fixed'
    style.top = `-${lockedScrollY}px`
    style.left = '0'
    style.right = '0'
    style.width = '100%'
  }
}
const releaseScrollLock = () => {
  if (lockCount === 0 || --lockCount > 0) return
  const { style } = document.body
  style.position = ''
  style.top = ''
  style.left = ''
  style.right = ''
  style.width = ''
  window.scrollTo(0, lockedScrollY)
}

export function useModalMenu(
  open: Ref<boolean>,
  container: Ref<HTMLElement | null>,
  opts: {
    /** Skip the automatic initial focus (the modal focuses its own field) */
    focusInitial?: boolean
    /** Skip Escape handling (the modal has its own close semantics) */
    closeOnEscape?: boolean
  } = {}
) {
  // this instance's share of the shared lock, so it releases exactly once
  let holding = false
  const lockScroll = () => {
    if (holding) return
    holding = true
    acquireScrollLock()
  }
  const unlockScroll = () => {
    if (!holding) return
    holding = false
    releaseScrollLock()
  }

  let lastFocused: HTMLElement | null = null

  watch(open, async (isOpen) => {
    if (!import.meta.client) return
    if (isOpen) {
      lastFocused = document.activeElement as HTMLElement | null
      lockScroll()
      await nextTick()
      if (opts.focusInitial !== false) {
        container.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
      }
    } else {
      unlockScroll()
      lastFocused?.focus()
    }
  })
  onUnmounted(() => {
    if (import.meta.client) unlockScroll()
  })

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (opts.closeOnEscape !== false) open.value = false
      return
    }
    if (e.key !== 'Tab' || !container.value) return
    const focusable = [...container.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!focusable.length) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const active = document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return { onKeydown }
}
