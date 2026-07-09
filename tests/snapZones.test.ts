import { describe, it, expect } from 'vitest'
import { edgeZone, zoneRect, keySnapTarget } from '~/utils/snapZones'

// a 1000×680 usable area (i.e. 1000×720 viewport minus a 40px taskbar)
const W = 1000
const H = 680

describe('edgeZone', () => {
  it('returns null away from every edge', () => {
    expect(edgeZone(500, 340, W, H)).toBeNull()
  })

  it('snaps to halves in the middle third of a side edge', () => {
    expect(edgeZone(5, 340, W, H)).toBe('left')
    expect(edgeZone(W - 5, 340, W, H)).toBe('right')
  })

  it('snaps to quadrants in the top/bottom thirds of a side edge', () => {
    expect(edgeZone(5, 20, W, H)).toBe('top-left')
    expect(edgeZone(5, H - 20, W, H)).toBe('bottom-left')
    expect(edgeZone(W - 5, 20, W, H)).toBe('top-right')
    expect(edgeZone(W - 5, H - 20, W, H)).toBe('bottom-right')
  })

  it('maximizes at the top-centre edge', () => {
    expect(edgeZone(500, 5, W, H)).toBe('top')
  })

  it('prefers a corner quadrant over the top edge when both apply', () => {
    // near the top AND the left edge → quadrant, not plain "top"
    expect(edgeZone(5, 5, W, H)).toBe('top-left')
  })
})

describe('zoneRect', () => {
  it('splits halves and quadrants without gaps or overlaps', () => {
    expect(zoneRect('left', W, H)).toEqual({ x: 0, y: 0, width: 500, height: 680 })
    expect(zoneRect('right', W, H)).toEqual({ x: 500, y: 0, width: 500, height: 680 })
    expect(zoneRect('top-left', W, H)).toEqual({ x: 0, y: 0, width: 500, height: 340 })
    expect(zoneRect('bottom-right', W, H)).toEqual({ x: 500, y: 340, width: 500, height: 340 })
  })

  it('maps top to the full usable area (maximize)', () => {
    expect(zoneRect('top', W, H)).toEqual({ x: 0, y: 0, width: W, height: H })
  })

  it('handles odd widths by giving the right side the remainder', () => {
    const odd = 999
    expect(zoneRect('left', odd, H).width).toBe(499)
    expect(zoneRect('right', odd, H).width).toBe(500)
  })
})

describe('keySnapTarget', () => {
  it('left/right take halves, re-pressing is a no-op', () => {
    expect(keySnapTarget(null, false, 'ArrowLeft')).toBe('left')
    expect(keySnapTarget('left', false, 'ArrowLeft')).toBeNull()
    expect(keySnapTarget('left', false, 'ArrowRight')).toBe('right')
  })

  it('up refines a half into its top quadrant, or maximizes', () => {
    expect(keySnapTarget('left', false, 'ArrowUp')).toBe('top-left')
    expect(keySnapTarget('right', false, 'ArrowUp')).toBe('top-right')
    expect(keySnapTarget('bottom-left', false, 'ArrowUp')).toBe('left')
    expect(keySnapTarget(null, false, 'ArrowUp')).toBe('maximize')
    expect(keySnapTarget(null, true, 'ArrowUp')).toBeNull()
  })

  it('down goes to the bottom quadrant, or restores', () => {
    expect(keySnapTarget('left', false, 'ArrowDown')).toBe('bottom-left')
    expect(keySnapTarget('top-right', false, 'ArrowDown')).toBe('right')
    expect(keySnapTarget(null, true, 'ArrowDown')).toBe('restore')
    expect(keySnapTarget('bottom-left', false, 'ArrowDown')).toBe('restore')
    expect(keySnapTarget(null, false, 'ArrowDown')).toBeNull()
  })
})
