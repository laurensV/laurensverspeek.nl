import { describe, it, expect } from 'vitest'
import { isEligibleTarget, spawnDebris, advanceDebris, edgeScrollDrive } from '../app/utils/destroyer'

const VIEWPORT = { w: 1000, h: 800 }

describe('isEligibleTarget', () => {
  it('accepts a normal small-to-medium leaf element', () => {
    expect(isEligibleTarget('SPAN', ['tag'], { width: 60, height: 20 }, VIEWPORT)).toBe(true)
    expect(isEligibleTarget('BUTTON', [], { width: 120, height: 40 }, VIEWPORT)).toBe(true)
  })

  it('rejects structural tags and scaffolding classes', () => {
    expect(isEligibleTarget('MAIN', [], { width: 50, height: 50 }, VIEWPORT)).toBe(false)
    expect(isEligibleTarget('SECTION', [], { width: 50, height: 50 }, VIEWPORT)).toBe(false)
    expect(isEligibleTarget('DIV', ['container'], { width: 50, height: 50 }, VIEWPORT)).toBe(false)
    expect(isEligibleTarget('DIV', ['x', 'site-shell'], { width: 50, height: 50 }, VIEWPORT)).toBe(false)
  })

  it('rejects things bigger than half the viewport, and slivers', () => {
    // half the viewport area is 400_000px²; 800×600 = 480_000 → too big
    expect(isEligibleTarget('DIV', [], { width: 800, height: 600 }, VIEWPORT)).toBe(false)
    expect(isEligibleTarget('DIV', [], { width: 3, height: 100 }, VIEWPORT)).toBe(false)
    expect(isEligibleTarget('DIV', [], { width: 100, height: 3 }, VIEWPORT)).toBe(false)
  })
})

describe('spawnDebris', () => {
  it('emits a fixed burst inside the rect with full life', () => {
    const rect = { left: 10, top: 20, width: 100, height: 50 }
    const parts = spawnDebris(rect, () => 0.5)
    expect(parts).toHaveLength(26)
    for (const p of parts) {
      expect(p.x).toBe(60) // 10 + 0.5*100
      expect(p.y).toBe(45) // 20 + 0.5*50
      expect(p.life).toBe(1)
      expect(p.color).toMatch(/^#/)
    }
    // vx/vy centered on the rand: (0.5-0.5)*9 = 0, (0.5-0.7)*9 = -1.8
    expect(parts[0]!.vx).toBeCloseTo(0)
    expect(parts[0]!.vy).toBeCloseTo(-1.8)
  })
})

describe('advanceDebris', () => {
  it('applies gravity, fades, and drops dead particles', () => {
    const live = { x: 0, y: 0, vx: 2, vy: -1, life: 1, color: '#fff' }
    const dying = { x: 0, y: 0, vx: 0, vy: 0, life: 0.02, color: '#fff' }
    const out = advanceDebris([live, dying])
    expect(out).toEqual([live]) // the dying one crossed 0 and was pruned
    expect(live.x).toBe(2)
    expect(live.vy).toBeCloseTo(-0.75) // -1 + 0.25 gravity
    expect(live.life).toBeCloseTo(0.975)
  })
})

describe('edgeScrollDrive', () => {
  const EDGE = 130
  const PUSH = 5

  it('scrolls down when driving into the bottom zone', () => {
    // ship at 720 (viewport 800, edge 130 → zone starts at 670), moving down
    const drive = edgeScrollDrive(720, 40, 800, 0, 2000, EDGE, PUSH)
    expect(drive.clampY).toBe(670)
    expect(drive.scroll).toBeCloseTo(50) // 720 - 670
  })

  it('scrolls up when driving into the top zone', () => {
    const drive = edgeScrollDrive(100, -40, 800, 500, 2000, EDGE, PUSH)
    expect(drive.clampY).toBe(130)
    expect(drive.scroll).toBeCloseTo(-30) // -(130 - 100)
  })

  it('does nothing for a ship resting in the zone (below the push threshold)', () => {
    expect(edgeScrollDrive(720, 2, 800, 0, 2000, EDGE, PUSH)).toEqual({ scroll: 0, clampY: null })
  })

  it('does not scroll past the document ends', () => {
    // already at the bottom: no more scroll available
    expect(edgeScrollDrive(720, 40, 800, 2000, 2000, EDGE, PUSH)).toEqual({ scroll: 0, clampY: null })
    // already at the very top: can't scroll up
    expect(edgeScrollDrive(100, -40, 800, 0, 2000, EDGE, PUSH)).toEqual({ scroll: 0, clampY: null })
  })

  it('clamps the scroll delta to the remaining distance', () => {
    // deep into the bottom zone but only 10px of document left
    const drive = edgeScrollDrive(790, 40, 800, 1990, 2000, EDGE, PUSH)
    expect(drive.scroll).toBeCloseTo(10)
  })
})
