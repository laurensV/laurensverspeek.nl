// The "copied ✓" pattern used by the blog RSS button, the share affordance and
// anywhere else that copies to the clipboard and briefly flips a label. One
// reactive flag + a copy() that resets itself after a moment.
import { writeClipboard } from '~/utils/clipboard'

export function useCopyFlag(resetMs = 1800) {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const flag = () => {
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), resetMs)
  }

  /** Copy text to the clipboard (recorded in the lvOS clipboard history) and
   * raise the flag on success. */
  const copy = async (text: string) => {
    const ok = await writeClipboard(text)
    if (ok) flag()
    return ok
  }

  onBeforeUnmount(() => clearTimeout(timer))
  return { copied, copy, flag }
}
