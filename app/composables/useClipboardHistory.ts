import { storageGetJson, storageSetJson } from '~/utils/safeStorage'

/** One remembered copy: the text and when it was copied. */
export interface ClipEntry { text: string, at: number }

const KEY = 'lvos-clipboard'
const MAX = 30

const isEntries = (v: unknown): v is ClipEntry[] =>
  Array.isArray(v) && v.every((e) => e && typeof (e as ClipEntry).text === 'string' && typeof (e as ClipEntry).at === 'number')

// A rolling history of what the site copied to the clipboard, shown by the lvOS
// Clipboard app. Every copy flows through writeClipboard() (app/utils/clipboard),
// whose recorder this composable registers, so terminal `| copy`, the blog
// copy buttons, the vCard, the colour picker and the share link all land here.
export function useClipboardHistory() {
  const items = useState<ClipEntry[]>(STATE_KEYS.clipboardHistory, () => storageGetJson(KEY, isEntries) ?? [])

  const persist = (next: ClipEntry[]) => {
    items.value = next
    storageSetJson(KEY, next)
  }

  /** Remember a copied string — newest first, de-duplicated, capped. */
  const record = (text: string) => {
    const t = text.trim()
    if (!t) return
    persist([{ text: t, at: Date.now() }, ...items.value.filter((e) => e.text !== t)].slice(0, MAX))
  }

  const clear = () => persist([])

  return { items, record, clear }
}
