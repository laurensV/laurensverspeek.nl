import { persistState } from '~/utils/persistState'
import { storageGet, storageSet } from '~/utils/safeStorage'
import { playKeyClick } from '~/utils/keyClick'

// Opt-in mechanical-keyboard typing sounds for the terminal. Off by default,
// persisted, and routed through the SAME shared volume/mute (useVolume) as
// every other sound on the site — silent when muted or at zero volume.
const KEY = 'lv-keyclick'

export function useKeyClick() {
  const enabled = useState(STATE_KEYS.keyClick, () => false)

  persistState(enabled, KEY, {
    restore: () => { enabled.value = storageGet(KEY) === '1' },
    persist: (on) => storageSet(KEY, on ? '1' : '0')
  })

  const { volume, muted } = useVolume()

  /** Play a click for one keystroke, if enabled and not muted. */
  const click = () => {
    if (!enabled.value || muted.value || volume.value <= 0) return
    playKeyClick(volume.value / 100)
  }

  const toggle = (on?: boolean) => { enabled.value = on ?? !enabled.value }

  return { enabled, click, toggle }
}
