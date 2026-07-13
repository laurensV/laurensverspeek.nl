import { describe, it, expect } from 'vitest'
import { sanitizeStroke, validPen, DRAW_COLORS, MAX_STROKES } from '../realtime/draw-core.mjs'

describe('sanitizeStroke', () => {
  it('accepts and returns a clean in-range segment', () => {
    expect(sanitizeStroke({ type: 'draw-stroke', x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.8, c: 2 }))
      .toEqual({ x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.8, c: 2 })
  })

  it('clamps out-of-range coordinates into [0,1]', () => {
    expect(sanitizeStroke({ x0: -1, y0: 2, x1: 0.5, y1: 0.5, c: 0 }))
      .toEqual({ x0: 0, y0: 1, x1: 0.5, y1: 0.5, c: 0 })
  })

  it('rejects a non-finite coordinate', () => {
    expect(sanitizeStroke({ x0: NaN, y0: 0, x1: 0, y1: 0, c: 1 })).toBeNull()
    expect(sanitizeStroke({ x0: 0, y0: Infinity, x1: 0, y1: 0, c: 1 })).toBeNull()
  })

  it('rejects a pen outside the palette', () => {
    expect(sanitizeStroke({ x0: 0, y0: 0, x1: 0, y1: 0, c: DRAW_COLORS.length })).toBeNull()
    expect(sanitizeStroke({ x0: 0, y0: 0, x1: 0, y1: 0, c: -1 })).toBeNull()
    expect(sanitizeStroke({ x0: 0, y0: 0, x1: 0, y1: 0, c: 1.5 })).toBeNull()
  })

  it('rejects non-objects', () => {
    expect(sanitizeStroke(null)).toBeNull()
    expect(sanitizeStroke('nope')).toBeNull()
    expect(sanitizeStroke(42)).toBeNull()
  })
})

describe('draw-core constants', () => {
  it('validPen covers exactly the palette indices', () => {
    expect(validPen(0)).toBe(true)
    expect(validPen(DRAW_COLORS.length - 1)).toBe(true)
    expect(validPen(DRAW_COLORS.length)).toBe(false)
  })

  it('keeps a bounded ring buffer', () => {
    expect(MAX_STROKES).toBeGreaterThan(0)
    expect(DRAW_COLORS.length).toBeGreaterThan(1)
  })
})
