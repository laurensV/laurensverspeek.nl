import { useEventListener } from '@vueuse/core'
import type { Ref } from 'vue'

// The taskbar popovers (start menu, calendar, notification center) behave
// like popovers: opening one closes the others, and clicking anywhere
// outside the taskbar dismisses them all.
export function useTaskbarPopovers(
  startOpen: Ref<boolean>,
  calendarOpen: Ref<boolean>,
  notifOpen: Ref<boolean>,
  volumeOpen: Ref<boolean>,
  moreOpen: Ref<boolean>,
  onNotifOpen: () => void
) {
  const closePopovers = () => {
    startOpen.value = false
    calendarOpen.value = false
    notifOpen.value = false
    volumeOpen.value = false
    moreOpen.value = false
  }

  const toggleNotifications = () => {
    const next = !notifOpen.value
    closePopovers()
    notifOpen.value = next
    if (next) onNotifOpen() // opening the panel clears the unread badge
  }

  const toggleCalendar = () => {
    const next = !calendarOpen.value
    closePopovers()
    calendarOpen.value = next
  }

  const toggleStart = () => {
    const next = !startOpen.value
    closePopovers()
    startOpen.value = next
  }

  const toggleVolume = () => {
    const next = !volumeOpen.value
    closePopovers()
    volumeOpen.value = next
  }

  // the collapsed tray items (weather/battery/tile/fullscreen) on a phone
  const toggleMore = () => {
    const next = !moreOpen.value
    closePopovers()
    moreOpen.value = next
  }

  useEventListener(document, 'pointerdown', (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest('.lvos-taskbar')) return
    closePopovers()
  })

  return { closePopovers, toggleStart, toggleCalendar, toggleNotifications, toggleVolume, toggleMore }
}
