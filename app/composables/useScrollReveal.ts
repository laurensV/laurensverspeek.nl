import { useIntersectionObserver, usePreferredReducedMotion } from '@vueuse/core'

/**
 * Adds `.is-revealed` to the element once it scrolls into view.
 * Pair with the global `.reveal` class for a fade/slide-in.
 */
export function useScrollReveal(target: Ref<HTMLElement | null | undefined>) {
  const revealed = ref(false)
  const reducedMotion = usePreferredReducedMotion()

  onMounted(() => {
    if (reducedMotion.value === 'reduce') {
      revealed.value = true
      return
    }
    const { stop } = useIntersectionObserver(
      target,
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          revealed.value = true
          stop()
        }
      },
      { threshold: 0.15 }
    )
  })

  return { revealed }
}
