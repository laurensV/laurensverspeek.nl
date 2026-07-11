import { storageGet, storageSet } from '~/utils/safeStorage'

// Shared "unseen items" count for the lvOS RSS reader's desktop badge. The
// reader records how many items exist; opening it marks them seen. Both
// numbers persist, so the badge survives across visits without re-fetching.
let restored = false

export function useLvosRss() {
  const count = useState('lvos-rss-count', () => 0)
  const seen = useState('lvos-rss-seen', () => 0)

  if (import.meta.client && !restored) {
    restored = true
    count.value = Number(storageGet('lvos-rss-count')) || 0
    seen.value = Number(storageGet('lvos-rss-seen')) || 0
  }

  const setCount = (n: number) => {
    count.value = n
    storageSet('lvos-rss-count', String(n))
  }
  const markSeen = () => {
    seen.value = count.value
    storageSet('lvos-rss-seen', String(count.value))
  }
  const unseen = computed(() => Math.max(0, count.value - seen.value))

  return { count, unseen, setCount, markSeen }
}
