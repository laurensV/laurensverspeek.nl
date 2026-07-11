import { describe, it, expect } from 'vitest'
import { boardToScreen, screenToBoard, visibleRange, clampCamera, clampZoom, MIN_ZOOM, MAX_ZOOM } from '../app/utils/worldCamera'

const view = { w: 640, h: 480 }

describe('the pixel-world camera', () => {
  it('round-trips board ↔ screen at the camera center', () => {
    const cam = { x: 64, y: 64, zoom: 8 }
    const screen = boardToScreen(cam, view, 64, 64)
    expect(screen).toEqual({ x: 320, y: 240 })
    expect(screenToBoard(cam, view, 320, 240)).toEqual({ x: 64, y: 64 })
  })

  it('maps neighbouring cells one zoom-step apart', () => {
    const cam = { x: 10, y: 10, zoom: 6 }
    const a = boardToScreen(cam, view, 10, 10)
    const b = boardToScreen(cam, view, 11, 10)
    expect(b.x - a.x).toBe(6)
  })

  it('reports only on-board visible cells', () => {
    const cam = { x: 2, y: 2, zoom: 40 } // zoomed into a corner
    const range = visibleRange(cam, view, 128)
    expect(range.x0).toBe(0)
    expect(range.y0).toBe(0)
    expect(range.x1).toBeLessThan(128)
  })

  it('clamps zoom and camera to sane bounds', () => {
    expect(clampZoom(1000)).toBe(MAX_ZOOM)
    expect(clampZoom(0.1)).toBe(MIN_ZOOM)
    const c = clampCamera({ x: -999, y: 999, zoom: 5 }, 128)
    expect(c.x).toBe(-4)
    expect(c.y).toBe(132)
  })
})
