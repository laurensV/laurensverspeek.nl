// One chokepoint every "copy to clipboard" in the site goes through, so the
// lvOS Clipboard app can keep a history of what was copied. The history
// composable registers its recorder here (via a client plugin); a null
// recorder — during SSR or before the plugin runs — just means "don't record".

type Recorder = (text: string) => void
let recorder: Recorder | null = null

/** Register the function that records a copied string (called once, by the
 * clipboard-history plugin). Kept module-level so writeClipboard can record
 * even from the terminal's copy pipe, which runs outside a component instance. */
export function setClipboardRecorder(fn: Recorder) {
  recorder = fn
}

/** Write text to the system clipboard and record it in the lvOS history.
 * Returns whether the write succeeded. */
export async function writeClipboard(text: string): Promise<boolean> {
  if (!import.meta.client) return false
  try {
    await navigator.clipboard.writeText(text)
    recorder?.(text)
    return true
  } catch {
    return false
  }
}
