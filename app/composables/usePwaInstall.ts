// beforeinstallprompt isn't in the standard lib types
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'lv-pwa-dismissed'
// module singletons: one deferred prompt shared by the install chip AND the
// terminal `install` command, so both drive the same native prompt
const deferred = ref<InstallPromptEvent | null>(null)
const installed = ref(false)
let wired = false

/**
 * Shared PWA-install state. Chrome/Edge/Android fire `beforeinstallprompt` when
 * the site is installable; we stash it so either the chip (PwaInstall.vue) or
 * the terminal `install` command can replay the native prompt. One source of
 * truth instead of the chip owning the event privately.
 */
export function usePwaInstall() {
  if (import.meta.client && !wired) {
    wired = true
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      // never re-offer once the visitor waved it off
      if (storageGet(DISMISS_KEY) === '1') return
      deferred.value = event as InstallPromptEvent
    })
    window.addEventListener('appinstalled', () => {
      installed.value = true
      deferred.value = null
      storageSet(DISMISS_KEY, '1')
    })
  }

  const canInstall = computed(() => !!deferred.value)

  // replay the native prompt; returns what happened so the chip and the terminal
  // command can report it
  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const event = deferred.value
    if (!event) return 'unavailable'
    await event.prompt()
    const { outcome } = await event.userChoice
    deferred.value = null
    return outcome
  }

  const dismiss = () => {
    deferred.value = null
    if (import.meta.client) storageSet(DISMISS_KEY, '1')
  }

  return { canInstall, installed, promptInstall, dismiss }
}
