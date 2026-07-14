import { describe, it, expect } from 'vitest'
import {
  wrap,
  normalizeAngle,
  circlesOverlap,
  stepShip,
  stepAsteroid,
  stepBullet,
  fireBullet,
  makeAsteroid,
  splitAsteroid,
  centeredShip,
  spawnWave,
  ASTEROID_RADIUS,
  SHIP_TURN,
  type Ship,
  type Field
} from '~/utils/games/asteroids'

const FIELD: Field = { width: 400, height: 300 }
const ship = (over: Partial<Ship> = {}): Ship => ({ x: 200, y: 150, vx: 0, vy: 0, angle: -Math.PI / 2, ...over })

// a tiny deterministic PRNG so the "random" pieces are reproducible under test
const seeded = (seed: number): (() => number) => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('wrap', () => {
  it('wraps coordinates into [0, max)', () => {
    expect(wrap(410, 400)).toBe(10)
    expect(wrap(-10, 400)).toBe(390)
    expect(wrap(50, 400)).toBe(50)
  })
  it('is a no-op for a zero/negative field (unlaid-out canvas)', () => {
    expect(wrap(42, 0)).toBe(42)
  })
})

describe('normalizeAngle', () => {
  it('keeps the heading in (-PI, PI]', () => {
    expect(normalizeAngle(Math.PI * 2)).toBeCloseTo(0)
    expect(normalizeAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2)
    const n = normalizeAngle(10)
    expect(n).toBeGreaterThan(-Math.PI)
    expect(n).toBeLessThanOrEqual(Math.PI)
  })
})

describe('circlesOverlap', () => {
  it('detects touching and separated circles', () => {
    expect(circlesOverlap(0, 0, 5, 8, 0, 5)).toBe(true) // gap 8 <= 10
    expect(circlesOverlap(0, 0, 5, 20, 0, 5)).toBe(false)
  })
})

describe('stepShip', () => {
  it('rotates at the turn rate only when asked', () => {
    const turned = stepShip(ship({ angle: 0 }), { thrust: false, turn: 1 }, 0.5, FIELD)
    expect(turned.angle).toBeCloseTo(SHIP_TURN * 0.5)
    const still = stepShip(ship({ angle: 0 }), { thrust: false, turn: 0 }, 0.5, FIELD)
    expect(still.angle).toBe(0)
  })

  it('thrusts along the heading, never sideways', () => {
    const s = stepShip(ship({ angle: -Math.PI / 2 }), { thrust: true, turn: 0 }, 0.1, FIELD)
    expect(s.vy).toBeLessThan(0) // nose-up gains upward (negative-y) speed
    expect(Math.abs(s.vx)).toBeLessThan(1e-6)
  })

  it('coasts and bleeds speed under drag when not thrusting', () => {
    const moving = ship({ vx: 200, vy: 0, angle: 0 })
    const s = stepShip(moving, { thrust: false, turn: 0 }, 0.1, FIELD)
    expect(s.vx).toBeLessThan(200)
    expect(s.vx).toBeGreaterThan(0)
  })

  it('wraps around the screen edges', () => {
    const s = stepShip(ship({ x: 399, vx: 200, angle: 0 }), { thrust: false, turn: 0 }, 0.5, FIELD)
    expect(s.x).toBeGreaterThanOrEqual(0)
    expect(s.x).toBeLessThan(FIELD.width)
  })
})

describe('stepAsteroid / stepBullet', () => {
  it('drifts and wraps an asteroid', () => {
    const a = makeAsteroid('large', 395, 10, seeded(1))
    const moved = stepAsteroid({ ...a, vx: 100, vy: 0 }, 0.2, FIELD)
    expect(moved.x).toBeLessThan(FIELD.width)
    expect(moved.angle).not.toBe(a.angle)
  })
  it('ages a bullet and expires it', () => {
    const b = stepBullet({ x: 10, y: 10, vx: 100, vy: 0, life: 0.05 }, 0.1, FIELD)
    expect(b.life).toBeLessThan(0)
  })
})

describe('fireBullet', () => {
  it('launches from the nose along the heading', () => {
    const b = fireBullet(ship({ angle: 0 }))
    expect(b.vx).toBeGreaterThan(0)
    expect(Math.abs(b.vy)).toBeLessThan(1e-6)
    expect(b.x).toBeGreaterThan(200) // ahead of the ship centre
  })
})

describe('splitAsteroid', () => {
  it('breaks large into two medium and medium into two small', () => {
    const large = makeAsteroid('large', 100, 100, seeded(2))
    const halves = splitAsteroid(large, seeded(3))
    expect(halves).toHaveLength(2)
    expect(halves.every((a) => a.size === 'medium')).toBe(true)
    expect(halves[0]!.radius).toBe(ASTEROID_RADIUS.medium)

    const smalls = splitAsteroid(makeAsteroid('medium', 0, 0, seeded(4)), seeded(5))
    expect(smalls.every((a) => a.size === 'small')).toBe(true)
  })
  it('destroys a small asteroid entirely', () => {
    expect(splitAsteroid(makeAsteroid('small', 0, 0, seeded(6)))).toEqual([])
  })
})

describe('spawnWave / centeredShip', () => {
  it('spawns the requested count of large rocks clear of the centre', () => {
    const rocks = spawnWave(5, FIELD, seeded(7), 100)
    expect(rocks).toHaveLength(5)
    expect(rocks.every((a) => a.size === 'large')).toBe(true)
    const cx = FIELD.width / 2
    const cy = FIELD.height / 2
    expect(rocks.every((a) => (a.x - cx) ** 2 + (a.y - cy) ** 2 >= 100 * 100)).toBe(true)
  })
  it('centres a stationary ship pointing up', () => {
    const s = centeredShip(FIELD)
    expect(s).toMatchObject({ x: 200, y: 150, vx: 0, vy: 0 })
    expect(s.angle).toBeCloseTo(-Math.PI / 2)
  })
})
