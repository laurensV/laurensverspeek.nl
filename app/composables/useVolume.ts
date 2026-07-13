import { storageGet, storageSet } from '~/utils/safeStorage'

const VOLUME_KEY = 'lvos-volume'
const MUTED_KEY = 'lvos-muted'

/**
 * One real volume for everything that makes sound. The taskbar tray edits it,
 * the chiptune engine (Media app) plays through it — shared + persisted, so
 * there are never two competing "volumes".
 */
export function useVolume() {
  const volume = useState(STATE_KEYS.lvosVolume, () => 70)
  const muted = useState(STATE_KEYS.lvosMuted, () => false)

  persistState(volume, VOLUME_KEY, {
    restore: () => {
      // a missing key must NOT read as 0 — Number(null) === 0 is finite and in
      // range, which would silently overwrite the default 70 and mute a fresh
      // visitor (same trap the night-light warmth restore hit in an earlier round)
      const raw = storageGet(VOLUME_KEY)
      if (raw === null) return
      const saved = Number(raw)
      if (Number.isFinite(saved) && saved >= 0 && saved <= 100) volume.value = saved
    },
    persist: (value) => storageSet(VOLUME_KEY, String(value))
  })
  persistState(muted, MUTED_KEY, {
    restore: () => (muted.value = storageGet(MUTED_KEY) === '1'),
    persist: (on) => storageSet(MUTED_KEY, on ? '1' : '0')
  })

  /** 0–1 gain factor: what audio engines should actually multiply by */
  const level = computed(() => (muted.value ? 0 : volume.value / 100))
  const glyph = computed(() => (muted.value || volume.value === 0 ? '🔇' : volume.value < 50 ? '🔉' : '🔊'))
  const toggleMute = () => (muted.value = !muted.value)

  return { volume, muted, level, glyph, toggleMute }
}
