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
const SNAP_MARGIN = 24

/** Where a drag-release would snap the window, if anywhere. */
export type SnapZone = 'left' | 'right' | 'top'

let zCounter = 10

// The zone the pointer is hovering while dragging, for the Aero-style preview.
const edgeZone = (x: number, y: number): SnapZone | null => {
  if (x <= SNAP_MARGIN) return 'left'
  if (x >= window.innerWidth - SNAP_MARGIN) return 'right'
  if (y <= SNAP_MARGIN) return 'top'
  return null
}

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

  // live snap hint while dragging; drives the preview overlay in WebDesktop
  const snapHint = ref<SnapZone | null>(null)
  const snapPreview = computed(() => {
    if (!snapHint.value || !import.meta.client) return null
    const half = Math.floor(window.innerWidth / 2)
    const height = window.innerHeight - TASKBAR_PX
    if (snapHint.value === 'left') return { x: 0, y: 0, width: half, height }
    if (snapHint.value === 'right') return { x: half, y: 0, width: half, height }
    return { x: 0, y: 0, width: window.innerWidth, height } // top → maximize
  })

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
      snapHint.value = edgeZone(event.clientX, event.clientY)
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
      const zone = edgeZone(event.clientX, event.clientY)
      if (zone === 'left') snap(dragging, 'left')
      else if (zone === 'right') snap(dragging, 'right')
      else if (zone === 'top') toggleMaximize(dragging)
    }
    dragging = null
    resizing = null
    snapHint.value = null
  })

  // Alt+Tab (Shift to reverse) cycles focus through the open windows, newest
  // stacking order first — the same idea as a desktop task switcher.
  const cycleWindows = (dir = 1) => {
    const open = windows.value.filter((w) => !w.minimized)
    if (open.length < 2) {
      if (open.length === 1) focusWindow(open[0]!)
      return
    }
    const byStack = [...open].sort((a, b) => a.z - b.z)
    const topIndex = byStack.length - 1
    const next = byStack[(topIndex + dir + byStack.length) % byStack.length]!
    focusWindow(next)
  }

  return {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    toggleMinimize,
    toggleMaximize,
    startDrag,
    startResize,
    snapPreview,
    cycleWindows
  }
}
