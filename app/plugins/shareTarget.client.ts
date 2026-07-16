import { STATE_KEYS } from '~/utils/stateKeys'
import { writeFileAt, dirEntries, type Filesystem } from '~/utils/terminal/filesystem'

// Web Share Target: the installed PWA registers as an OS share destination
// (manifest share_target → GET /desktop?share-*). Sharing a link or text from
// any app opens lvOS with the shared content pinned as a real sticky note in
// ~/stickies — the same files the Notes app and the terminal see. Runs on
// app:mounted so the VFS restore/seed (terminalFs plugin) has already landed.
export default defineNuxtPlugin((nuxtApp) => {
  const route = useRoute()
  if (route.path !== '/desktop') return
  const param = (key: string) => {
    const raw = route.query[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    return typeof value === 'string' ? value.trim() : ''
  }
  const title = param('share-title')
  const text = param('share-text')
  const url = param('share-url')
  if (!title && !text && !url) return

  // captured at plugin setup (valid Nuxt context); the hook runs later
  const files = useState<Filesystem>(STATE_KEYS.terminalFs, () => ({}))
  const pendingApp = useState<string>(STATE_KEYS.lvosPendingApp, () => '')

  nuxtApp.hook('app:mounted', () => {
    if (!files.value['stickies']?.dir) {
      files.value = { ...files.value, stickies: { dir: true, content: '' } }
    }
    const taken = new Set(dirEntries(files.value, 'stickies').map((entry) => entry.name))
    let n = 1
    while (taken.has(`shared-${n}.txt`)) n++
    const body = [title, text, url].filter(Boolean).join('\n')
    const written = writeFileAt(files.value, '', `stickies/shared-${n}.txt`, body)
    if (!('error' in written)) files.value = written.files

    // land the visitor in the notes app, note already pinned
    pendingApp.value = 'notes'
    // the share params are one-shot — a reload or bookmark shouldn't re-pin.
    // Nuxt finalizes hydration with a replaceState of the ORIGINAL url some
    // time after app:mounted (isReady/nextTick still lose the race), so the
    // strip waits it out; a second late is invisible for a cosmetic url fix.
    setTimeout(() => {
      window.history.replaceState(window.history.state, '', '/desktop')
    }, 1200)
  })
})
