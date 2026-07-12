import { storageGet, storageSet } from '~/utils/safeStorage'
import { isSaverId, SAVER_IDS, SAVER_NAMES } from '~/utils/screensavers'
import type { SaverId } from '~/utils/screensavers'

const SAVER_KEY = 'lvos-saver'

/** Which screensaver runs on idle — picked in Settings, persisted. */
export function useScreensaverChoice() {
  const saver = useState<SaverId>(STATE_KEYS.lvosSaver, () => 'starfield')

  persistState(saver, SAVER_KEY, {
    restore: () => {
      const stored = storageGet(SAVER_KEY)
      if (isSaverId(stored)) saver.value = stored
    },
    persist: (value) => storageSet(SAVER_KEY, value)
  })

  return { saver, saverIds: SAVER_IDS, saverNames: SAVER_NAMES }
}
