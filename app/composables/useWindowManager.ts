import { useEventListener } from '@vueuse/core'

// lvOS window manager: state + drag/resize/snap/maximize logic, extracted
// from WebDesktop.vue so the desktop shell only concerns itself with apps.

export interface DesktopWindow {
  id: string
  title: string
  x: number
  y: number
  z: number
  /** Explicit size once the user resized/snapped; otherwise CSS decides */
  width?: number
  height?: number
  minimized: boolean
  maximized: boolean
  /** Rect to restore after un-maximizing/un-snapping */
  restore?: { x: number, y: number, width?: number, height?: number }
}

const TASKBAR_PX = 40
const MIN_W = 280
const MIN_H = 140
const SNAP_MARGIN = 12

let zCounter = 10

export function useWindowManager(titles: Record<string, string> = {}) {
  // useState so the layout survives logging out and back in during a visit
  const windows = useState<DesktopWindow[]>('lvos-windows', () => [])

  const focusWindow = (win: DesktopWindow) => {
    win.z = ++zCounter
  }

  const openWindow = (id: string) => {
    const existing = windows.value.find((w) => w.id === id)
    if (existing) {
      existing.minimized = false
      focusWindow(existing)
      return
    }
    const offset = windows.value.length * 34
    windows.value.push({
      id,
      title: titles[id] ?? id,
      x: Math.min(90 + offset, window.innerWidth / 3),
      y: 70 + offset,
      z: ++zCounter,
      minimized: false,
      maximized: false
    })
  }

  const closeWindow = (id: string) => {
    windows.value = windows.value.filter((w) => w.id !== id)
  }

  const toggleMinimize = (win: DesktopWindow) => {
    win.minimized = !win.minimized
    if (!win.minimized) focusWindow(win)
  }

  const saveRestoreRect = (win: DesktopWindow) => {
    win.restore = { x: win.x, y: win.y, width: win.width, height: win.height }
  }

  const restoreRect = (win: DesktopWindow) => {
    if (!win.restore) return
    win.x = win.restore.x
    win.y = win.restore.y
    win.width = win.restore.width
    win.height = win.restore.height
    win.restore = undefined
  }

  const toggleMaximize = (win: DesktopWindow) => {
    if (win.maximized) {
      win.maximized = false
      restoreRect(win)
    } else {
      saveRestoreRect(win)
      win.maximized = true
    }
    focusWindow(win)
  }

  const snap = (win: DesktopWindow, side: 'left' | 'right') => {
    if (!win.restore) saveRestoreRect(win)
    const half = Math.floor(window.innerWidth / 2)
    win.maximized = false
    win.x = side === 'left' ? 0 : half
    win.y = 0
    win.width = half
    win.height = window.innerHeight - TASKBAR_PX
  }

  // ---- pointer interactions ----
  let dragging: DesktopWindow | null = null
  let dragOffset = { x: 0, y: 0 }
  let resizing: DesktopWindow | null = null
  let resizeStart = { px: 0, py: 0, w: 0, h: 0 }

  const startDrag = (win: DesktopWindow, event: PointerEvent) => {
    focusWindow(win)
    if (win.maximized) {
      // dragging a maximized window "peels" it off under the cursor
      win.maximized = false
      restoreRect(win)
      win.x = event.clientX - (win.width ?? 400) / 2
      win.y = event.clientY - 14
    }
    dragging = win
    dragOffset = { x: event.clientX - win.x, y: event.clientY - win.y }
  }

  const startResize = (win: DesktopWindow, event: PointerEvent) => {
    focusWindow(win)
    if (win.maximized) return
    const el = (event.target as HTMLElement).closest('.lvos-window') as HTMLElement | null
    resizing = win
    resizeStart = {
      px: event.clientX,
      py: event.clientY,
      w: win.width ?? el?.offsetWidth ?? 400,
      h: win.height ?? el?.offsetHeight ?? 300
    }
  }

  useEventListener('pointermove', (event: PointerEvent) => {
    if (dragging) {
      dragging.x = Math.max(0, Math.min(event.clientX - dragOffset.x, window.innerWidth - 120))
      dragging.y = Math.max(0, Math.min(event.clientY - dragOffset.y, window.innerHeight - 80))
    } else if (resizing) {
      resizing.width = Math.max(MIN_W, resizeStart.w + event.clientX - resizeStart.px)
      resizing.height = Math.max(MIN_H, resizeStart.h + event.clientY - resizeStart.py)
      // manual resize means the snap/maximize restore rect is stale
      resizing.restore = undefined
    }
  })

  useEventListener('pointerup', (event: PointerEvent) => {
    if (dragging) {
      // release against an edge: snap left/right, maximize at the top
      if (event.clientX <= SNAP_MARGIN) snap(dragging, 'left')
      else if (event.clientX >= window.innerWidth - SNAP_MARGIN) snap(dragging, 'right')
      else if (event.clientY <= SNAP_MARGIN) toggleMaximize(dragging)
    }
    dragging = null
    resizing = null
  })

  return {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    toggleMinimize,
    toggleMaximize,
    startDrag,
    startResize
  }
}
