import { storageRemove } from '~/utils/safeStorage'

// The RSS badge and the mail app's blog-post mails describe the SAME posts,
// so they share ONE seen-state: the mail read set. Opening the reader marks
// every post mail read (mail badge shrinks too); reading a post mail in the
// inbox shrinks the RSS badge. One set of posts, one number.
let cleaned = false

export function useLvosRss() {
  const { mails, read, markRead } = useLvosMail()

  if (import.meta.client && !cleaned) {
    cleaned = true
    // retire the reader's old private counters (they could disagree with mail)
    storageRemove('lvos-rss-count')
    storageRemove('lvos-rss-seen')
  }

  const postMails = computed(() => mails.value.filter((mail) => mail.postPath))
  const unseen = computed(() => postMails.value.filter((mail) => !read.value.has(mail.id)).length)
  const markSeen = () => postMails.value.forEach((mail) => markRead(mail.id))

  return { unseen, markSeen }
}
