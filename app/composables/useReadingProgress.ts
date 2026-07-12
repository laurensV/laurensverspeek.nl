import { useEventListener } from '@vueuse/core'

/** How far down the page the reader is, 0..1 — drives the top scanline. */
export function useReadingProgress() {
  const progress = ref(0)

  const update = () => {
    const doc = document.documentElement
    const total = doc.scrollHeight - doc.clientHeight
    progress.value = total > 0 ? Math.min(1, doc.scrollTop / total) : 0
  }

  useEventListener('scroll', update, { passive: true })
  onMounted(update)

  return { progress }
}
