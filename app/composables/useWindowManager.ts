import { useEventListener } from '@vueuse/core'
import { edgeZone as computeZone, zoneRect as computeRect, type SnapZone } from '~/utils/snapZones'
import { nextInCycle, resizeRect, clampDragPosition, spawnPosition } from '~/utils/windowOrder'

// lvOS window manager: state + drag/resize/snap/maximize logic, extracted
// from WebDesktop.vue so the desktop shell only concerns itself with apps.

export interface DesktopWindow {
  id: string
  title: string
  x: number
  y: number
  z: number
  /** Explicit size once the user resized/snapped; otherwise CSS decides */
  width?: number | undefined
  height?: number | undefined
  minimized: boolean
  maximized: boolean
  /** Pinned windows float above the rest (z boost applied in the shell) */
  pinned?: boolean
  /** Rect to restore after un-maximizing/un-snapping */
  restore?: { x: number, y: number, width?: number | undefined, height?: number | undefined } | undefined
}

const TASKBAR_PX = 40
const MIN_W = 280
const MIN_H = 140

let zCounter = 10

// bind the pure snap geometry to the live viewport (minus the taskbar)
const edgeZone = (x: number, y: number) =>
  computeZone(x, y, window.innerWidth, window.innerHeight - TASKBAR_PX)
const zoneRect = (zone: SnapZone) =>
  computeRect(zone, window.innerWidth, window.innerHeight - TASKBAR_PX)

export function useWindowManager(titles: Record<string, string> = {}) {
  // useState so the layout survives logging out and back in during a visit
  const windows = useState<DesktopWindow[]>(STATE_KEYS.lvosWindows, () => [])

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
    const spawn = spawnPosition(windows.value.length, window.innerWidth)
    windows.value.push({
      id,
      title: titles[id] ?? id,
      x: spawn.x,
      y: spawn.y,
      z: ++zCounter,
      minimized: false,
      maximized: false
    })
  }

  const closeWindow = (id: string) => {
    windows.value = windows.value.filter((w) => w.id !== id)
  }

  const togglePin = (win: DesktopWindow) => {
    win.pinned = !win.pinned
    focusWindow(win)
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

  // snap to a half or quadrant (top-center maximizes via toggleMaximize instead)
  const snap = (win: DesktopWindow, zone: SnapZone) => {
    if (!win.restore) saveRestoreRect(win)
    win.maximized = false
    const rect = zoneRect(zone)
    win.x = rect.x
    win.y = rect.y
    win.width = rect.width
    win.height = rect.height
  }

  // ---- pointer interactions ----
  let dragging: DesktopWindow | null = null
  let dragOffset = { x: 0, y: 0 }
  let resizing: DesktopWindow | null = null
  let resizeDir = ''
  let resizeStart = { px: 0, py: 0, x: 0, y: 0, w: 0, h: 0 }

  // live snap hint while dragging; drives the preview overlay in WebDesktop
  const snapHint = ref<SnapZone | null>(null)
  const snapPreview = computed(() =>
    snapHint.value && import.meta.client ? zoneRect(snapHint.value) : null
  )

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

  // dir is any combination of n/s/e/w (edges) or two of them (corners)
  const startResize = (win: DesktopWindow, event: PointerEvent, dir = 'se') => {
    focusWindow(win)
    if (win.maximized) return
    const el = (event.target as HTMLElement).closest('.lvos-window') as HTMLElement | null
    resizing = win
    resizeDir = dir
    resizeStart = {
      px: event.clientX,
      py: event.clientY,
      x: win.x,
      y: win.y,
      w: win.width ?? el?.offsetWidth ?? 400,
      h: win.height ?? el?.offsetHeight ?? 300
    }
  }

  useEventListener('pointermove', (event: PointerEvent) => {
    if (dragging) {
      const pos = clampDragPosition(event.clientX, event.clientY, dragOffset, window.innerWidth, window.innerHeight)
      dragging.x = pos.x
      dragging.y = pos.y
      snapHint.value = edgeZone(event.clientX, event.clientY)
    } else if (resizing) {
      const rect = resizeRect(
        resizeStart,
        resizeDir,
        event.clientX - resizeStart.px,
        event.clientY - resizeStart.py,
        MIN_W,
        MIN_H
      )
      resizing.x = rect.x
      resizing.y = rect.y
      resizing.width = rect.width
      resizing.height = rect.height
      // manual resize means the snap/maximize restore rect is stale
      resizing.restore = undefined
    }
  })

  useEventListener('pointerup', (event: PointerEvent) => {
    if (dragging) {
      // release against an edge: maximize at the top-center, else snap to the
      // matching half or quadrant
      const zone = edgeZone(event.clientX, event.clientY)
      if (zone === 'top') toggleMaximize(dragging)
      else if (zone) snap(dragging, zone)
    }
    dragging = null
    resizing = null
    snapHint.value = null
  })

  // Alt+Tab (Shift to reverse) cycles focus through the open windows, newest
  // stacking order first — the same idea as a desktop task switcher.
  const cycleWindows = (dir = 1) => {
    const next = nextInCycle(windows.value, dir)
    if (next) focusWindow(next)
  }

  return {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    toggleMinimize,
    toggleMaximize,
    togglePin,
    startDrag,
    startResize,
    snapPreview,
    cycleWindows
  }
}
