import { useEventListener } from '@vueuse/core'

/**
 * Scroll-aware header state: `scrolled` once the page leaves the top, and
 * `progress` (0..1) through the document — drives the navbar's hairline and
 * its reading-progress rail.
 */
export function useScrollProgress() {
  const scrolled = ref(false)
  const progress = ref(0)

  const onScroll = () => {
    const { scrollY, innerHeight } = window
    scrolled.value = scrollY > 12
    const scrollable = document.documentElement.scrollHeight - innerHeight
    progress.value = scrollable > 0 ? Math.min(scrollY / scrollable, 1) : 0
  }
  useEventListener('scroll', onScroll, { passive: true })
  useEventListener('resize', onScroll, { passive: true })
  onMounted(onScroll)

  return { scrolled, progress }
}
