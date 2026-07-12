import { storageGetJson, storageSetJson, isStringArray } from '~/utils/safeStorage'

// The lvOS inbox: the one mail dataset (rendered by DesktopMail) plus shared
// read-state, so the desktop icon can wear an accurate unread badge without
// mounting the app — and the badge can never drift from the actual messages.

export interface LvosMail {
  id: string
  from: string
  address: string
  subject: string
  date: string
  body: string[]
  /** set on blog-post mails: the post to open in the blog app */
  postPath?: string
}

export const LVOS_MAILS: LvosMail[] = [
  {
    id: 'hr-boss-key',
    from: 'HR',
    address: 'hr@lvos.local',
    subject: 'RE: the "boss key" incident',
    date: 'mon',
    body: [
      'Hi,',
      'It has come to our attention that pressing b twice replaces the entire',
      'workstation with a spreadsheet titled Q3_forecast_v7_FINAL(2).xlsx.',
      'To be clear: this is not a sanctioned productivity tool. It is,',
      'however, a very convincing spreadsheet. The numbers even sum.',
      'Please use it responsibly.',
      '— HR (we see everything, including pid 925)'
    ]
  },
  {
    id: 'newsletter',
    from: 'lvOS weekly',
    address: 'newsletter@lvos.local',
    subject: 'this week in lvOS: everything is a process now',
    date: 'tue',
    body: [
      'IN THIS ISSUE:',
      '• ps now lists your windows. kill closes them. democracy!',
      '• a tamagotchi has been sighted wandering the desktop',
      '• the recycle bin forgives, the recycle bin forgets (when emptied)',
      '• tip of the week: alt+r launches anything, including regret',
      'You are receiving this because you booted an operating system',
      'inside a portfolio website. Unsubscribing is spiritually impossible.'
    ]
  },
  {
    id: 'prince',
    from: 'Prince Adetokunbo',
    address: 'definitely.real@royal.example',
    subject: 'URGENT BUSINESS PROPOSAL (100% legitimate)',
    date: 'wed',
    body: [
      'Dearest friend,',
      'I am writing concerning the sum of 4,700,000 localStorage bytes',
      'currently frozen in an offshore browser profile. I require only a',
      'small advance of trust (and your vim config) to release the funds.',
      'Kindly do not report this message to the easter_eggs.service.',
      'Yours in perpetual sincerity,',
      'A. Prince'
    ]
  },
  {
    id: 'sysadmin',
    from: 'root',
    address: 'root@lvos.local',
    subject: 'fork bomb detected (politely declined)',
    date: 'thu',
    body: [
      'At 03:12 an sh script attempted to run itself recursively.',
      'The shell said, quote, "nice fork bomb though", and stopped it.',
      'No processes were harmed. The uptime remains immaculate.',
      'This message was brought to you by pid 1, who sees all and kills none.'
    ]
  },
  {
    id: 'curator',
    from: 'the museum curator',
    address: 'curator@lvos.local',
    subject: 'your visit left footprints on the gallery floor',
    date: 'fri',
    body: [
      'A visitor was observed walking the museum at an unusual hour,',
      'reading plaques with what witnesses describe as "genuine interest".',
      'The gift shop (see: /contact) remains open. The grue in the basement',
      'sends its regards and, reassuringly, its apologies in advance.'
    ]
  }
]

const READ_KEY = 'lvos-mail-read'
let restored = false
let postsRequested = false

export function useLvosMail() {
  const read = useState<Set<string>>('lvos-mail-read-state', () => new Set())
  // real blog posts delivered as newsletter mails — the badge means something
  const postMails = useState<LvosMail[]>('lvos-mail-posts', () => [])

  if (import.meta.client && !restored) {
    restored = true
    const saved = storageGetJson(READ_KEY, isStringArray)
    if (saved) read.value = new Set(saved)
  }

  // fetch once per app; every caller sits in a setup/factory context, so
  // queryCollection still finds the Nuxt app
  if (import.meta.client && !postsRequested) {
    postsRequested = true
    void queryCollection('blog')
      .order('date', 'DESC')
      .all()
      .then((posts) => {
        postMails.value = posts.map((post) => ({
          id: `post:${post.path}`,
          from: 'the blog',
          address: 'blog@lvos.local',
          subject: `new post: ${post.title}`,
          date: post.date
            ? new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toLowerCase()
            : '',
          body: [
            post.description,
            '',
            '→ open it below, or find it in the blog app'
          ],
          postPath: post.path
        }))
      })
      .catch((err: unknown) => {
        // offline/hiccup: the fake inbox still works, posts just don't arrive
        console.warn('[mail] blog posts unavailable:', err)
        postsRequested = false
      })
  }

  const mails = computed<LvosMail[]>(() => [...postMails.value, ...LVOS_MAILS])

  const markRead = (id: string) => {
    if (read.value.has(id)) return
    read.value = new Set(read.value).add(id)
    storageSetJson(READ_KEY, [...read.value])
  }

  const unread = computed(() => mails.value.filter((mail) => !read.value.has(mail.id)).length)

  return { read, markRead, unread, mails }
}
