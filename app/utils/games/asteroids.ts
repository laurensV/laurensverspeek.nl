// Pure geometry + simulation for the lvOS Asteroids game (see
// DesktopAsteroids.vue). The component owns the canvas, input and the rAF loop;
// this owns the maths — screen wrapping, ship momentum, asteroid drift and
// splitting, and circle hit-testing — so all of it is DOM-free and unit-tested.
// (Comments stay OFF the `export const` lines: Nuxt's auto-import scanner
// scrapes tokens out of trailing comments on those lines.)

export interface Field {
  width: number
  height: number
}

export interface Ship {
  x: number
  y: number
  vx: number
  vy: number
  /** heading in radians; 0 points right, -PI/2 points up */
  angle: number
}

export type AsteroidSize = 'large' | 'medium' | 'small'

export interface Asteroid {
  x: number
  y: number
  vx: number
  vy: number
  size: AsteroidSize
  /** collision + draw radius in px */
  radius: number
  /** current rotation of the drawn rock, radians */
  angle: number
  /** spin rate, radians per second */
  spin: number
  /** per-vertex radius multipliers giving each rock its craggy silhouette */
  shape: number[]
}

export interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  /** seconds of life left before it fizzles out */
  life: number
}

export interface ShipInput {
  /** forward thrust held */
  thrust: boolean
  /** -1 rotates left (ccw), +1 right (cw), 0 holds the heading */
  turn: -1 | 0 | 1
}

/** A 0..1 source of randomness — injectable so the simulation is deterministic
 * under test (defaults to Math.random in the component). */
export type Rng = () => number

// Tuned for a small lvOS window (a few hundred px): a long glide from low drag,
// turns that take commitment, bullets that cross about half the field. Units:
// accel px/s^2, drag per second, rotation rad/s, speeds px/s, lifetimes s. Only
// the constants the component/tests reference are exported; the rest are the
// module's private tuning.
const SHIP_THRUST = 260
const SHIP_DRAG = 0.6
export const SHIP_TURN = 3.4
export const SHIP_RADIUS = 11
const BULLET_SPEED = 340
const BULLET_LIFE = 0.9

export const ASTEROID_RADIUS: Record<AsteroidSize, number> = { large: 34, medium: 20, small: 11 }
const ASTEROID_SPEED: Record<AsteroidSize, number> = { large: 34, medium: 52, small: 78 }
export const ASTEROID_SCORE: Record<AsteroidSize, number> = { large: 20, medium: 50, small: 100 }

// what a rock becomes when shot; small ones vanish
const NEXT_SIZE: Record<AsteroidSize, AsteroidSize | null> = { large: 'medium', medium: 'small', small: null }

/** Wrap a coordinate into [0, max) so entities re-enter from the far edge. */
export function wrap(value: number, max: number): number {
  if (max <= 0) return value
  return ((value % max) + max) % max
}

/** Normalize an angle to (-PI, PI] so the heading never drifts to huge numbers. */
export function normalizeAngle(angle: number): number {
  let a = (angle + Math.PI) % (Math.PI * 2)
  if (a < 0) a += Math.PI * 2
  return a - Math.PI
}

/** True when two circles overlap (squared-distance test — no sqrt). */
export function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx
  const dy = ay - by
  const rr = ar + br
  return dx * dx + dy * dy <= rr * rr
}

/**
 * Advance the ship one step: rotate by the held turn, thrust along the nose,
 * bleed speed under drag, then integrate and wrap. Pure — returns a new state.
 */
export function stepShip(ship: Ship, input: ShipInput, dt: number, field: Field): Ship {
  const angle = ship.angle + input.turn * SHIP_TURN * dt
  let vx = ship.vx
  let vy = ship.vy
  if (input.thrust) {
    vx += Math.cos(angle) * SHIP_THRUST * dt
    vy += Math.sin(angle) * SHIP_THRUST * dt
  }
  const drag = Math.exp(-SHIP_DRAG * dt)
  vx *= drag
  vy *= drag
  return {
    x: wrap(ship.x + vx * dt, field.width),
    y: wrap(ship.y + vy * dt, field.height),
    vx,
    vy,
    angle: normalizeAngle(angle)
  }
}

/** Drift an asteroid and spin its silhouette; wraps at the edges. */
export function stepAsteroid(asteroid: Asteroid, dt: number, field: Field): Asteroid {
  return {
    ...asteroid,
    x: wrap(asteroid.x + asteroid.vx * dt, field.width),
    y: wrap(asteroid.y + asteroid.vy * dt, field.height),
    angle: asteroid.angle + asteroid.spin * dt
  }
}

/** Fly a bullet forward, wrapping, and age it. */
export function stepBullet(bullet: Bullet, dt: number, field: Field): Bullet {
  return {
    x: wrap(bullet.x + bullet.vx * dt, field.width),
    y: wrap(bullet.y + bullet.vy * dt, field.height),
    vx: bullet.vx,
    vy: bullet.vy,
    life: bullet.life - dt
  }
}

/** A shot from the ship's nose, inheriting the ship's velocity. */
export function fireBullet(ship: Ship): Bullet {
  const nx = Math.cos(ship.angle)
  const ny = Math.sin(ship.angle)
  return {
    x: ship.x + nx * SHIP_RADIUS,
    y: ship.y + ny * SHIP_RADIUS,
    vx: ship.vx + nx * BULLET_SPEED,
    vy: ship.vy + ny * BULLET_SPEED,
    life: BULLET_LIFE
  }
}

/** A fresh rock of `size` at (x, y) with a random heading, spin and silhouette. */
export function makeAsteroid(size: AsteroidSize, x: number, y: number, rng: Rng = Math.random): Asteroid {
  const dir = rng() * Math.PI * 2
  const speed = ASTEROID_SPEED[size] * (0.6 + rng() * 0.8)
  const shape = Array.from({ length: 10 }, () => 0.75 + rng() * 0.4)
  return {
    x,
    y,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    size,
    radius: ASTEROID_RADIUS[size],
    angle: rng() * Math.PI * 2,
    spin: (rng() - 0.5) * 1.6,
    shape
  }
}

/** Break a shot rock into two of the next size down, or [] when it was small. */
export function splitAsteroid(asteroid: Asteroid, rng: Rng = Math.random): Asteroid[] {
  const next = NEXT_SIZE[asteroid.size]
  if (!next) return []
  return [makeAsteroid(next, asteroid.x, asteroid.y, rng), makeAsteroid(next, asteroid.x, asteroid.y, rng)]
}

/** A ship at rest in the centre of the field, nose pointing up. */
export function centeredShip(field: Field): Ship {
  return { x: field.width / 2, y: field.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2 }
}

/**
 * A wave of `count` large asteroids, each kept a safe distance from the centre
 * so a fresh wave never spawns on top of the re-centred ship.
 */
export function spawnWave(count: number, field: Field, rng: Rng = Math.random, safeRadius = 120): Asteroid[] {
  const cx = field.width / 2
  const cy = field.height / 2
  const out: Asteroid[] = []
  for (let i = 0; i < count; i++) {
    let x = 0
    let y = 0
    for (let tries = 0; tries < 20; tries++) {
      x = rng() * field.width
      y = rng() * field.height
      if ((x - cx) ** 2 + (y - cy) ** 2 >= safeRadius * safeRadius) break
    }
    out.push(makeAsteroid('large', x, y, rng))
  }
  return out
}
