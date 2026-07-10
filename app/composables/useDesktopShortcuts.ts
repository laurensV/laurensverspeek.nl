import { useEventListener } from '@vueuse/core'
import type { Ref } from 'vue'
import type { DesktopWindow } from '~/composables/useWindowManager'
import type { ArrowKey } from '~/utils/snapZones'

// The lvOS keyboard: ?, ~, Alt+R, Alt+Tab, Ctrl+Alt+arrows and the layered
// Escape behavior, extracted from WebDesktop. Everything pauses while the
// lock screen is up.

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

export function useDesktopShortcuts(deps: {
  locked: Ref<boolean>
  shortcutsOpen: Ref<boolean>
  runOpen: Ref<boolean>
  startOpen: Ref<boolean>
  calendarOpen: Ref<boolean>
  notifOpen: Ref<boolean>
  contextMenu: { open: boolean }
  titleMenu: { open: boolean }
  terminalOpen: Ref<boolean>
  windows: Ref<DesktopWindow[]>
  openWindow: (id: string) => void
  keySnap: (win: DesktopWindow, key: ArrowKey) => void
  cycleWindows: (dir: number) => void
  logout: () => void
}) {
  // Alt+R toggles the run dialog
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (deps.locked.value || !event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key.toLowerCase() !== 'r') return
    event.preventDefault()
    deps.runOpen.value = !deps.runOpen.value
  })

  // ? toggles the cheat sheet (unless typing in a field)
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (deps.locked.value || event.key !== '?' || isTyping(event.target)) return
    event.preventDefault()
    deps.shortcutsOpen.value = !deps.shortcutsOpen.value
  })

  // inside the desktop, ~ opens/focuses the terminal window (unless typing)
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (deps.locked.value) return
    if (event.key !== '~' && event.key !== '`') return
    if (isTyping(event.target)) return
    event.preventDefault()
    deps.openWindow('terminal')
  })

  // Ctrl+Alt+arrows snap the top window to halves/quadrants (up maximizes,
  // down restores) — the keyboard sibling of dragging against an edge
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (deps.locked.value || !event.ctrlKey || !event.altKey) return
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    const top = [...deps.windows.value].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]
    if (!top) return
    event.preventDefault()
    deps.keySnap(top, event.key as ArrowKey)
  })

  // Alt+Tab switches between open windows (Shift+Alt+Tab goes backwards). The
  // OS may reserve it; the taskbar remains the always-available switcher.
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (deps.locked.value) return
    if (event.key !== 'Tab' || !event.altKey) return
    event.preventDefault()
    deps.cycleWindows(event.shiftKey ? -1 : 1)
  })

  useEventListener('keydown', (event: KeyboardEvent) => {
    // a locked screen ignores Escape — it wouldn't be much of a lock otherwise
    if (deps.locked.value) return
    if (deps.shortcutsOpen.value && event.key === 'Escape') {
      event.preventDefault()
      deps.shortcutsOpen.value = false
      return
    }
    // defaultPrevented means the terminal already consumed this Escape
    if (event.key !== 'Escape' || event.defaultPrevented || deps.terminalOpen.value) {
      return
    }
    // Escape first dismisses popups, only logging out when nothing is open
    if (deps.contextMenu.open || deps.titleMenu.open || deps.startOpen.value
      || deps.calendarOpen.value || deps.notifOpen.value || deps.runOpen.value) {
      deps.contextMenu.open = false
      deps.titleMenu.open = false
      deps.startOpen.value = false
      deps.calendarOpen.value = false
      deps.notifOpen.value = false
      deps.runOpen.value = false
      return
    }
    deps.logout()
  })
}
