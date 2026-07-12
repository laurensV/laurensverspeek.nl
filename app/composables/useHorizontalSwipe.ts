import { useEventListener } from '@vueuse/core'

/**
 * A mostly-horizontal touch swipe past a threshold calls back with its
 * direction; vertical scrolling and short drags are ignored.
 */
export function useHorizontalSwipe(onSwipe: (direction: 'left' | 'right') => void) {
  let touchStart: { x: number, y: number } | null = null

  const onTouchStart = (event: TouchEvent) => {
    const t = event.changedTouches[0]
    touchStart = t ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchEnd = (event: TouchEvent) => {
    const t = event.changedTouches[0]
    if (!touchStart || !t) return
    const dx = t.clientX - touchStart.x
    const dy = t.clientY - touchStart.y
    touchStart = null
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return // not a horizontal swipe
    onSwipe(dx < 0 ? 'left' : 'right')
  }

  useEventListener('touchstart', onTouchStart, { passive: true })
  useEventListener('touchend', onTouchEnd, { passive: true })
}
