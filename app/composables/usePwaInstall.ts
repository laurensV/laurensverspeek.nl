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
const dismissed = ref(false)
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
    dismissed.value = storageGet(DISMISS_KEY) === '1'
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      // stash the prompt even after a dismissal — the chip stays hidden, but
      // the terminal `install` command is an explicit ask and must still work
      deferred.value = event as InstallPromptEvent
    })
    window.addEventListener('appinstalled', () => {
      installed.value = true
      deferred.value = null
      dismissed.value = true
      storageSet(DISMISS_KEY, '1')
    })
  }

  const canInstall = computed(() => !!deferred.value)
  // the proactive chip also honours "never re-offer once waved off"
  const chipVisible = computed(() => !!deferred.value && !dismissed.value)

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
    // hide the chip only; keep the deferred prompt for explicit installs
    dismissed.value = true
    if (import.meta.client) storageSet(DISMISS_KEY, '1')
  }

  return { canInstall, chipVisible, installed, promptInstall, dismiss }
}
