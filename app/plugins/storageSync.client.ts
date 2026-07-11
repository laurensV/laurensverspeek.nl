import type { Filesystem } from '~/utils/terminal/filesystem'
import { FS_KEY, sanitizeFs } from '~/utils/terminal/filesystem'
import { adoptTombstones } from '~/utils/terminal/siteFs'
import { isTrashEntries } from '~/utils/trash'
import type { TrashEntry } from '~/utils/trash'
import { isStringArray } from '~/utils/safeStorage'

// Two tabs share localStorage but not useState — without this, whichever tab
// writes 'lv-terminal-fs' last would resurrect files the other tab deleted
// (and drop its edits). The storage event only fires in OTHER tabs, so
// adopting the incoming value keeps every tab converged on the same files,
// trash and tombstones. (Re-saving the adopted value writes an identical
// string, which fires no further events — no ping-pong.)

const parse = (raw: string | null): unknown => {
  try {
    return JSON.parse(raw ?? 'null') as unknown
  } catch {
    return null
  }
}

export default defineNuxtPlugin(() => {
  const files = useState<Filesystem>(STATE_KEYS.terminalFs, () => ({}))
  const trash = useState<TrashEntry[]>(STATE_KEYS.lvosTrash, () => [])

  window.addEventListener('storage', (event) => {
    if (event.key === FS_KEY) {
      // keep this tab's seeded sys nodes, adopt the other tab's user layer
      const theirs = sanitizeFs(parse(event.newValue))
      const seeds = Object.fromEntries(
        Object.entries(files.value).filter(([, node]) => node.sys)
      )
      files.value = { ...seeds, ...theirs }
      return
    }
    if (event.key === 'lv-fs-deleted') {
      const parsed = parse(event.newValue)
      if (!isStringArray(parsed)) return
      const deleted = adoptTombstones(parsed)
      // the other tab deleted seeded site files — drop our copies too
      files.value = Object.fromEntries(
        Object.entries(files.value).filter(([path, node]) => !(node.sys && deleted.has(path)))
      )
      return
    }
    if (event.key === 'lv-trash') {
      const parsed = parse(event.newValue)
      if (isTrashEntries(parsed)) trash.value = parsed
    }
  })
})
