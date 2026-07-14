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
  // (the shared press-hold machine the Files app's row menu uses too)
  const press = useLongPress(({ x, y, target }) => showContextMenu(target, x, y))

  return {
    contextMenu,
    showContextMenu,
    openContextMenu,
    closeContextMenu,
    onDesktopTouchStart: press.start,
    onDesktopTouchMove: press.move,
    onDesktopTouchEnd: press.end
  }
}
