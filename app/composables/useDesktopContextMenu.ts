// The lvOS desktop's right-click menu and its touch equivalent: a right-click
// (or a ~500ms long-press, since touch has no right-click) on the desktop
// background summons the context menu, clamped to stay on-screen. Pulled out of
// WebDesktop so the shell component stays about windows and apps.
export function useDesktopContextMenu() {
  const contextMenu = reactive({ open: false, x: 0, y: 0 })

  const showContextMenu = (target: HTMLElement, clientX: number, clientY: number) => {
    // only on the desktop background, not on top of a window or the taskbar
    if (target.closest('.lvos-window, .lvos-taskbar')) return
    contextMenu.x = Math.min(clientX, window.innerWidth - 200)
    contextMenu.y = Math.min(clientY, window.innerHeight - 220)
    contextMenu.open = true
  }
  const openContextMenu = (event: MouseEvent) =>
    showContextMenu(event.target as HTMLElement, event.clientX, event.clientY)
  const closeContextMenu = () => { contextMenu.open = false }

  // touch has no right-click, so a ~500ms long-press summons the desktop menu
  let pressTimer: ReturnType<typeof setTimeout> | undefined
  let pressAt: { x: number, y: number } | null = null
  let longPressed = false
  const onDesktopTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    longPressed = false
    pressAt = { x: touch.clientX, y: touch.clientY }
    const target = event.target as HTMLElement
    pressTimer = setTimeout(() => {
      longPressed = true
      showContextMenu(target, pressAt!.x, pressAt!.y)
    }, 500)
  }
  const onDesktopTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (pressAt && touch && (Math.abs(touch.clientX - pressAt.x) > 10 || Math.abs(touch.clientY - pressAt.y) > 10)) {
      clearTimeout(pressTimer)
    }
  }
  const onDesktopTouchEnd = (event: TouchEvent) => {
    clearTimeout(pressTimer)
    // suppress the synthesised click so it can't immediately dismiss the menu the
    // long-press just opened (works regardless of how long the finger was held)
    if (longPressed) event.preventDefault()
  }
  onUnmounted(() => clearTimeout(pressTimer))

  return {
    contextMenu,
    showContextMenu,
    openContextMenu,
    closeContextMenu,
    onDesktopTouchStart,
    onDesktopTouchMove,
    onDesktopTouchEnd
  }
}
