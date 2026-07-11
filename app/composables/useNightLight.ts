import { storageGet, storageSet } from '~/utils/safeStorage'

const ENABLED_KEY = 'lvos-nightlight'
const WARMTH_KEY = 'lvos-nightlight-warmth'

/**
 * lvOS night light: a warm amber wash over the whole desktop, toggled from the
 * Displays app and rendered as an overlay by WebDesktop. Shared + persisted, so
 * closing the Displays window leaves the tint on (like the real thing).
 */
export function useNightLight() {
  const enabled = useState('lvos-nightlight-on', () => false)
  const warmth = useState('lvos-nightlight-warmth', () => 45)

  persistState(enabled, ENABLED_KEY, {
    restore: () => (enabled.value = storageGet(ENABLED_KEY) === '1'),
    persist: (on) => storageSet(ENABLED_KEY, on ? '1' : '0')
  })
  persistState(warmth, WARMTH_KEY, {
    restore: () => {
      const saved = Number(storageGet(WARMTH_KEY))
      if (saved >= 0 && saved <= 100) warmth.value = saved
    },
    persist: (value) => storageSet(WARMTH_KEY, String(value))
  })

  // overlay opacity peaks around 0.6 so text stays legible even at full warmth
  const overlayOpacity = computed(() => (enabled.value ? (warmth.value / 100) * 0.6 : 0))

  return { enabled, warmth, overlayOpacity }
}
