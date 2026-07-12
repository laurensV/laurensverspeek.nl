import { storageGet, storageSet } from '~/utils/safeStorage'

const SHOW_KEY = 'lv-show-cursors'

/**
 * Shared state between LiveCursors (which owns the websocket) and the status
 * bar badge: how many people are browsing right now, and whether their cursor
 * dots are drawn. Dots are OFF by default — the badge click flips them, and
 * the choice persists. Everything is inert unless the relay is configured.
 */
export interface VisitorGeo {
  id: number
  hue: number
  /** UTC offset in minutes */
  tz: number
}

export function useLiveVisitors() {
  const count = useState(STATE_KEYS.liveVisitorCount, () => 0)
  const showCursors = useState(STATE_KEYS.liveCursorsVisible, () => false)
  // outbox for the terminal `say` command → LiveCursors broadcasts it
  const outbox = useState<{ text: string, ts: number } | null>(STATE_KEYS.liveSayOutbox, () => null)
  // every live visitor's id/hue/timezone, published by LiveCursors for the globe
  const geo = useState<VisitorGeo[]>(STATE_KEYS.liveVisitorGeo, () => [])
  persistState(showCursors, SHOW_KEY, {
    restore: () => (showCursors.value = storageGet(SHOW_KEY) === '1'),
    persist: (value) => storageSet(SHOW_KEY, value ? '1' : '0')
  })
  // captured here, not inside the computed — lazy evaluation can happen
  // outside the Nuxt instance (same hazard as the blog jsonld computed)
  const cursorsWs = useRuntimeConfig().public.cursorsWs
  const enabled = computed(() => Boolean(cursorsWs))
  const say = (text: string) => (outbox.value = { text, ts: Date.now() })
  return { count, showCursors, enabled, outbox, geo, say }
}
