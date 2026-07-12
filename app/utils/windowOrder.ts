// Pure geometry/ordering math for the lvOS window manager. useWindowManager
// binds these to the live viewport and pointer events; keeping them pure makes
// the tricky edge cases (wrap-around, min sizes, origin shifts) unit-testable.

export interface WindowLike {
  z: number
  minimized: boolean
}

/**
 * Alt+Tab order: with the stack sorted by z, moving `dir` (+1 back / -1
 * forward) from the top window, wrapping around. Minimized windows don't
 * take part. Returns null when nothing is open.
 */
export function nextInCycle<T extends WindowLike>(windows: T[], dir = 1): T | null {
  const open = windows.filter((w) => !w.minimized)
  if (!open.length) return null
  if (open.length === 1) return open[0]!
  const byStack = [...open].sort((a, b) => a.z - b.z)
  const topIndex = byStack.length - 1
  return byStack[(topIndex + dir + byStack.length) % byStack.length]!
}

export interface ResizeStart {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Rect after dragging a resize handle by (dx, dy). `dir` is any combination
 * of n/s/e/w; west/north handles also shift the window's origin so the
 * opposite edge stays put. Never shrinks below the minimum size.
 */
export function resizeRect(start: ResizeStart, dir: string, dx: number, dy: number, minW: number, minH: number) {
  const rect = { x: start.x, y: start.y, width: start.w, height: start.h }
  if (dir.includes('e')) rect.width = Math.max(minW, start.w + dx)
  if (dir.includes('s')) rect.height = Math.max(minH, start.h + dy)
  if (dir.includes('w')) {
    rect.width = Math.max(minW, start.w - dx)
    rect.x = start.x + (start.w - rect.width)
  }
  if (dir.includes('n')) {
    rect.height = Math.max(minH, start.h - dy)
    rect.y = start.y + (start.h - rect.height)
  }
  return rect
}

/** Window position under the pointer, kept partially on-screen. */
export function clampDragPosition(
  pointerX: number,
  pointerY: number,
  offset: { x: number, y: number },
  viewportW: number,
  viewportH: number
) {
  return {
    x: Math.max(0, Math.min(pointerX - offset.x, viewportW - 120)),
    y: Math.max(0, Math.min(pointerY - offset.y, viewportH - 80))
  }
}

/** Cascade for freshly opened windows, capped so they never spawn off-screen
 * (both axes — an off-bottom spawn hides the titlebar, the only drag handle).
 * The x cap also keeps a default-width window's right edge (and its ✕) on
 * screen, which matters on phones where 90px + a 330px window ran off-frame. */
export function spawnPosition(openCount: number, viewportW: number, viewportH = 800) {
  const offset = openCount * 34
  // the default (non-wide) window renders at min(26rem, 88vw); keep it fully on
  // screen, but never tighter than the desktop viewportW/3 cascade cap
  const winW = Math.min(26 * 16, viewportW * 0.88)
  const maxX = Math.max(8, Math.min(viewportW / 3, viewportW - winW - 8))
  return {
    x: Math.min(90 + offset, maxX),
    // keep the titlebar well within the viewport (minus the taskbar)
    y: Math.min(70 + offset, Math.max(70, viewportH - 220))
  }
}
