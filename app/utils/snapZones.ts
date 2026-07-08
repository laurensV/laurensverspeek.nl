// Pure geometry for lvOS window snapping: which zone a pointer is in while
// dragging, and the screen rect each zone maps to. Dimension-parameterized so
// it can be unit-tested without a DOM.

export type SnapZone =
  | 'left' | 'right' | 'top'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface Rect { x: number, y: number, width: number, height: number }

export const SNAP_MARGIN = 24

/**
 * The snap zone for a pointer at (x, y) over a viewport `viewW` wide with
 * `usableH` usable height (viewport minus the taskbar). At a side edge the
 * vertical thirds choose a quadrant (top/bottom) or a half (middle); the
 * top-centre edge maximizes. Returns null when the pointer is away from edges.
 */
export function edgeZone(
  x: number,
  y: number,
  viewW: number,
  usableH: number,
  margin = SNAP_MARGIN
): SnapZone | null {
  const nearLeft = x <= margin
  const nearRight = x >= viewW - margin
  if (nearLeft || nearRight) {
    const side = nearLeft ? 'left' : 'right'
    if (y <= usableH / 3) return `top-${side}` as SnapZone
    if (y >= (usableH * 2) / 3) return `bottom-${side}` as SnapZone
    return side
  }
  if (y <= margin) return 'top'
  return null
}

/** The screen rect a zone maps to (top = full-screen maximize preview). */
export function zoneRect(zone: SnapZone, viewW: number, usableH: number): Rect {
  const halfW = Math.floor(viewW / 2)
  const halfH = Math.floor(usableH / 2)
  switch (zone) {
    case 'left': return { x: 0, y: 0, width: halfW, height: usableH }
    case 'right': return { x: halfW, y: 0, width: viewW - halfW, height: usableH }
    case 'top-left': return { x: 0, y: 0, width: halfW, height: halfH }
    case 'top-right': return { x: halfW, y: 0, width: viewW - halfW, height: halfH }
    case 'bottom-left': return { x: 0, y: halfH, width: halfW, height: usableH - halfH }
    case 'bottom-right': return { x: halfW, y: halfH, width: viewW - halfW, height: usableH - halfH }
    case 'top': return { x: 0, y: 0, width: viewW, height: usableH }
  }
}
