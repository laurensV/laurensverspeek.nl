import { storageGetJson, storageSetJson, isStringArray } from '~/utils/safeStorage'

// Shared read-state for the lvOS mail app, so the desktop icon can wear an
// unread badge without mounting the inbox. The mail *content* stays in
// DesktopMail; this only knows the ids.

export const MAIL_IDS = ['hr-boss-key', 'newsletter', 'prince', 'sysadmin', 'curator'] as const

const READ_KEY = 'lvos-mail-read'
let restored = false

export function useLvosMail() {
  const read = useState<Set<string>>('lvos-mail-read-state', () => new Set())

  if (import.meta.client && !restored) {
    restored = true
    const saved = storageGetJson(READ_KEY, isStringArray)
    if (saved) read.value = new Set(saved)
  }

  const markRead = (id: string) => {
    if (read.value.has(id)) return
    read.value = new Set(read.value).add(id)
    storageSetJson(READ_KEY, [...read.value])
  }

  const unread = computed(() => MAIL_IDS.filter((id) => !read.value.has(id)).length)

  return { read, markRead, unread }
}
