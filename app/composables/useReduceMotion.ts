import { persistState } from '~/utils/persistState'

// A manual "reduce motion" switch, on top of the OS `prefers-reduced-motion`.
// When on it stamps `data-reduce-motion` on <html>, which a global CSS blanket
// (see global.scss) uses to flatten every animation/transition site-wide — for
// visitors who want motion off regardless of their system setting. The site's
// existing `@media (prefers-reduced-motion)` handling still covers the OS case.
const KEY = 'lv-reduce-motion'

export function useReduceMotion() {
  const enabled = useState(STATE_KEYS.reduceMotion, () => false)

  persistState(enabled, KEY, {
    restore: () => { enabled.value = storageGet(KEY) === '1' },
    persist: (on) => storageSet(KEY, on ? '1' : '0')
  })

  if (import.meta.client) {
    watch(enabled, (on) => {
      document.documentElement.toggleAttribute('data-reduce-motion', on)
    }, { immediate: true })
  }

  const toggle = () => { enabled.value = !enabled.value }
  return { enabled, toggle }
}
