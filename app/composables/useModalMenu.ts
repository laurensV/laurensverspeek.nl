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
export function useModalMenu(open: Ref<boolean>, container: Ref<HTMLElement | null>) {
  let lockedScrollY = 0
  const lockScroll = () => {
    lockedScrollY = window.scrollY
    const { style } = document.body
    style.position = 'fixed'
    style.top = `-${lockedScrollY}px`
    style.left = '0'
    style.right = '0'
    style.width = '100%'
  }
  const unlockScroll = () => {
    const { style } = document.body
    style.position = ''
    style.top = ''
    style.left = ''
    style.right = ''
    style.width = ''
    window.scrollTo(0, lockedScrollY)
  }

  let lastFocused: HTMLElement | null = null

  watch(open, async (isOpen) => {
    if (!import.meta.client) return
    if (isOpen) {
      lastFocused = document.activeElement as HTMLElement | null
      lockScroll()
      await nextTick()
      container.value?.querySelector<HTMLElement>('a, button')?.focus()
    } else {
      unlockScroll()
      lastFocused?.focus()
    }
  })
  onUnmounted(() => {
    if (import.meta.client && open.value) unlockScroll()
  })

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      open.value = false
      return
    }
    if (e.key !== 'Tab' || !container.value) return
    const focusable = [...container.value.querySelectorAll<HTMLElement>('a, button')]
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
