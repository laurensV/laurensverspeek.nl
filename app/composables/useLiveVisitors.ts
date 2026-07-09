import { storageGet, storageSet } from '~/utils/safeStorage'

const SHOW_KEY = 'lv-show-cursors'
let restored = false

/**
 * Shared state between LiveCursors (which owns the websocket) and the status
 * bar badge: how many people are browsing right now, and whether their cursor
 * dots are drawn. Dots are OFF by default — the badge click flips them, and
 * the choice persists. Everything is inert unless the relay is configured.
 */
export function useLiveVisitors() {
  const count = useState('live-visitor-count', () => 0)
  const showCursors = useState('live-cursors-visible', () => false)
  // outbox for the terminal `say` command → LiveCursors broadcasts it
  const outbox = useState<{ text: string, ts: number } | null>('live-say-outbox', () => null)
  if (import.meta.client && !restored) {
    restored = true
    showCursors.value = storageGet(SHOW_KEY) === '1'
    watch(showCursors, (value) => storageSet(SHOW_KEY, value ? '1' : '0'))
  }
  const enabled = computed(() => Boolean(useRuntimeConfig().public.cursorsWs))
  const say = (text: string) => (outbox.value = { text, ts: Date.now() })
  return { count, showCursors, enabled, outbox, say }
}
