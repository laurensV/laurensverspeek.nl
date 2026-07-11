import { removeToTrash, restoreEntry, isTrashEntries } from '~/utils/trash'
import type { TrashEntry } from '~/utils/trash'
import type { Filesystem } from '~/utils/terminal/filesystem'
import { markSeedsDeleted, unmarkSeedsDeleted } from '~/utils/terminal/siteFs'
import { storageGetJson, storageSetJson } from '~/utils/safeStorage'

const TRASH_KEY = 'lv-trash'
let restoredOnce = false
let entryId = 1

/** The lvOS recycle bin: `rm` and the Files app move things here instead of
 * destroying them; the desktop app restores or empties. Persisted. */
export function useTrash() {
  const entries = useState<TrashEntry[]>(STATE_KEYS.lvosTrash, () => [])
  // the terminal's home filesystem, by its shared state key — NOT via
  // useTerminal(), which builds its command registry through this composable
  const files = useState<Filesystem>(STATE_KEYS.terminalFs, () => ({}))

  if (import.meta.client && !restoredOnce) {
    restoredOnce = true
    const saved = storageGetJson(TRASH_KEY, isTrashEntries)
    if (saved) {
      entries.value = saved
      entryId = Math.max(0, ...saved.map((entry) => entry.id)) + 1
    }
    watch(entries, (list) => storageSetJson(TRASH_KEY, list), { deep: true })
  }

  /** Move a home-relative path (file or dir + subtree) into the bin. */
  const discard = (path: string): TrashEntry | null => {
    const result = removeToTrash(files.value, path, entryId++, Date.now())
    if (!result) return null
    files.value = result.files
    // deleted site content stays deleted next visit (until a reseed)
    markSeedsDeleted(Object.keys(result.entry.nodes))
    // newest first, and the bin only keeps so much garbage
    entries.value = [result.entry, ...entries.value].slice(0, 50)
    return result.entry
  }

  const restore = (id: number) => {
    const entry = entries.value.find((candidate) => candidate.id === id)
    if (!entry) return
    files.value = restoreEntry(files.value, entry)
    unmarkSeedsDeleted(Object.keys(entry.nodes))
    entries.value = entries.value.filter((candidate) => candidate.id !== id)
  }

  const empty = () => {
    entries.value = []
  }

  return { entries, discard, restore, empty }
}
