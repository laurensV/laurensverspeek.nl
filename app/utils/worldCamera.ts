// Pure camera math for the Pixel World viewport: a board-space center + a
// zoom (pixels per cell), and the coordinate transforms between board and
// screen. Kept separate from the Vue wrapper so it's unit-testable.

export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface View {
  w: number
  h: number
}

export const MIN_ZOOM = 2
export const MAX_ZOOM = 40

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

/** Board cell → screen pixel (top-left of the cell). */
export function boardToScreen(cam: Camera, view: View, bx: number, by: number) {
  return {
    x: view.w / 2 + (bx - cam.x) * cam.zoom,
    y: view.h / 2 + (by - cam.y) * cam.zoom
  }
}

/** Screen pixel → integer board cell (floored). */
export function screenToBoard(cam: Camera, view: View, sx: number, sy: number) {
  return {
    x: Math.floor(cam.x + (sx - view.w / 2) / cam.zoom),
    y: Math.floor(cam.y + (sy - view.h / 2) / cam.zoom)
  }
}

/** The inclusive board-cell rectangle currently visible (clamped to [0,size)). */
export function visibleRange(cam: Camera, view: View, size: number) {
  const from = screenToBoard(cam, view, 0, 0)
  const to = screenToBoard(cam, view, view.w, view.h)
  return {
    x0: Math.max(0, from.x),
    y0: Math.max(0, from.y),
    x1: Math.min(size - 1, to.x + 1),
    y1: Math.min(size - 1, to.y + 1)
  }
}

/** Keep the camera center within the board (with a little overscroll). */
export function clampCamera(cam: Camera, size: number): Camera {
  const margin = 4
  return {
    x: Math.min(size + margin, Math.max(-margin, cam.x)),
    y: Math.min(size + margin, Math.max(-margin, cam.y)),
    zoom: clampZoom(cam.zoom)
  }
}
