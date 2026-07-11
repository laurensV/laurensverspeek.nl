import { describe, it, expect } from 'vitest'
import { stepShip, steerToward, angleDelta, SHIP_ROT_SPEED, type ShipState } from '~/utils/shipPhysics'

const ship = (over: Partial<ShipState> = {}): ShipState =>
  ({ x: 500, y: 500, vx: 0, vy: 0, angle: -Math.PI / 2, ...over })

describe('angleDelta', () => {
  it('returns the shortest signed turn', () => {
    expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(angleDelta(0, -Math.PI / 2)).toBeCloseTo(-Math.PI / 2)
    // going 350°→10° is +20°, not −340°
    expect(angleDelta((350 * Math.PI) / 180, (10 * Math.PI) / 180)).toBeCloseTo((20 * Math.PI) / 180)
  })
})

describe('stepShip', () => {
  it('rotates at the turn rate and only turns when asked', () => {
    const turned = stepShip(ship({ angle: 0 }), { thrust: false, turn: 1, dt: 0.5 })
    expect(turned.angle).toBeCloseTo(SHIP_ROT_SPEED * 0.5)
    const still = stepShip(ship({ angle: 0 }), { thrust: false, turn: 0, dt: 0.5 })
    expect(still.angle).toBe(0)
  })

  it('thrusts forward along the heading, never sideways', () => {
    // nose-up (−π/2): thrust adds negative vy, ~zero vx
    const s = stepShip(ship({ angle: -Math.PI / 2 }), { thrust: true, turn: 0, dt: 0.1 })
    expect(s.vy).toBeLessThan(0)
    expect(Math.abs(s.vx)).toBeLessThan(1e-6)
  })

  it('coasts and bleeds speed under drag when not thrusting', () => {
    const moving = ship({ vx: 300, vy: 0, angle: 0 })
    const s = stepShip(moving, { thrust: false, turn: 0, dt: 0.1 })
    expect(s.vx).toBeLessThan(300) // drag shed some speed
    expect(s.vx).toBeGreaterThan(0) // but it still glides
    expect(s.x).toBeGreaterThan(500) // and moved forward
  })

  it('keeps the heading normalized to (−π, π]', () => {
    const s = stepShip(ship({ angle: Math.PI - 0.01 }), { thrust: false, turn: 1, dt: 1 })
    expect(s.angle).toBeGreaterThanOrEqual(-Math.PI)
    expect(s.angle).toBeLessThanOrEqual(Math.PI)
  })
})

describe('steerToward', () => {
  it('eases the nose toward a point, capped by the turn rate', () => {
    // target down-and-right (unambiguous shorter turn is clockwise); nose up
    const turnedAngle = steerToward(ship({ angle: -Math.PI / 2 }), 900, 700, 0.1)
    // turned clockwise (toward the target) but not all the way in one step
    expect(turnedAngle).toBeGreaterThan(-Math.PI / 2)
    expect(Math.abs(turnedAngle - (-Math.PI / 2))).toBeLessThanOrEqual(SHIP_ROT_SPEED * 0.1 + 1e-9)
  })
})
