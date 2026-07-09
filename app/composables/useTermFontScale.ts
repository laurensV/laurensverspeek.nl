import { storageGet, storageSet } from '~/utils/safeStorage'

const KEY = 'lv-terminal-fontscale'
const MIN = 0.7
const MAX = 1.6
let restored = false

/** The terminal's text scale (ctrl+= / ctrl+- or the fontsize command), persisted. */
export function useTermFontScale() {
  const scale = useState(STATE_KEYS.terminalFontScale, () => 1)
  if (import.meta.client && !restored) {
    restored = true
    const saved = Number(storageGet(KEY))
    if (saved >= MIN && saved <= MAX) scale.value = saved
    watch(scale, (value) => storageSet(KEY, String(value)))
  }
  const set = (value: number) => {
    scale.value = Math.min(MAX, Math.max(MIN, Math.round(value * 10) / 10))
  }
  const bump = (delta: number) => set(scale.value + delta)
  return { scale, set, bump }
}
