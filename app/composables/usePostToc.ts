import type { Ref } from 'vue'

export interface TocEntry { id: string, text: string, depth: number }

interface TocLink { id: string, text: string, depth: number, children?: TocLink[] }

/**
 * The post's table of contents (flattened h2 + h3) plus which heading is
 * currently on screen, tracked with an IntersectionObserver over the body.
 */
export function usePostToc(
  links: Ref<TocLink[] | undefined>,
  bodyRef: Ref<HTMLElement | undefined>
) {
  const tocLinks = computed<TocEntry[]>(() => {
    const flat: TocEntry[] = []
    for (const link of links.value ?? []) {
      flat.push({ id: link.id, text: link.text, depth: link.depth })
      for (const child of link.children ?? []) {
        flat.push({ id: child.id, text: child.text, depth: child.depth })
      }
    }
    return flat
  })

  const activeHeading = ref('')
  let headingObserver: IntersectionObserver | undefined

  onMounted(() => {
    const headings = bodyRef.value?.querySelectorAll('h2[id], h3[id]')
    if (!headings?.length) return
    headingObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) activeHeading.value = entry.target.id
        }
      },
      { rootMargin: '0px 0px -70% 0px' }
    )
    headings.forEach((heading) => headingObserver!.observe(heading))
  })

  onUnmounted(() => headingObserver?.disconnect())

  return { tocLinks, activeHeading }
}
