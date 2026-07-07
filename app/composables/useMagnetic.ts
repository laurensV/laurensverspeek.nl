import { usePreferredReducedMotion } from '@vueuse/core'

/**
 * v-magnetic directive: the element leans a few pixels toward the cursor.
 * Registered globally via the directives plugin.
 */
export const magneticDirective = {
  mounted(el: HTMLElement) {
    const reducedMotion = usePreferredReducedMotion()
    const strength = 0.24
    const maxShift = 6

    const onMove = (event: PointerEvent) => {
      if (reducedMotion.value === 'reduce' || event.pointerType !== 'mouse') return
      const rect = el.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)
      const x = Math.max(-maxShift, Math.min(maxShift, dx * strength))
      const y = Math.max(-maxShift, Math.min(maxShift, dy * strength))
      el.style.transform = `translate(${x}px, ${y}px)`
    }

    const onLeave = () => {
      el.style.transform = ''
    }

    el.style.transition = 'transform 0.18s ease'
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)
    ;(el as HTMLElement & { _magneticCleanup?: () => void })._magneticCleanup = () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  },
  unmounted(el: HTMLElement & { _magneticCleanup?: () => void }) {
    el._magneticCleanup?.()
  }
}
