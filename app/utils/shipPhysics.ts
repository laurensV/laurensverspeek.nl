// Pure flight model for the destroy-mode ship (see DomDestroyer.vue). Asteroids
// physics: rotate to aim, thrust only along the nose, heavy momentum from a low
// drag. Kept free of the DOM (scroll, walls, hit-testing live in the component)
// so the feel can be unit-tested.

export interface ShipState {
  x: number
  y: number
  vx: number
  vy: number
  /** heading in radians; 0 points right, -π/2 points up */
  angle: number
}

export interface ShipInput {
  /** forward thrust held */
  thrust: boolean
  /** negative rotates left (ccw), positive right (cw), 0 none */
  turn: number
  /** seconds since the last step */
  dt: number
}

// low thrust + low drag = a long glide and direction changes that take real
// commitment (à la kickassapp.com / Asteroids). Units: accel in px per second
// squared, drag per second (top speed is roughly accel over drag), rotation in
// radians per second. (Comments stay OFF the export lines: Nuxt's auto-import
// scanner scrapes tokens out of trailing comments on `export const` lines.)
export const SHIP_ACCEL = 900
export const SHIP_DRAG = 0.7
export const SHIP_ROT_SPEED = 3.2

/** Smallest signed angle from `from` to `to`, normalized to [-π, π]. */
export function angleDelta(from: number, to: number): number {
  let diff = (to - from + Math.PI) % (Math.PI * 2)
  if (diff < 0) diff += Math.PI * 2
  return diff - Math.PI
}

/**
 * Advance the ship one step under `input`. Returns a new state (pure) — the
 * caller applies world constraints (walls, page scroll) afterwards.
 */
export function stepShip(ship: ShipState, input: ShipInput): ShipState {
  const { dt } = input
  let angle = ship.angle + Math.sign(input.turn) * SHIP_ROT_SPEED * dt
  let vx = ship.vx
  let vy = ship.vy
  if (input.thrust) {
    vx += Math.cos(angle) * SHIP_ACCEL * dt
    vy += Math.sin(angle) * SHIP_ACCEL * dt
  }
  const drag = Math.exp(-SHIP_DRAG * dt)
  vx *= drag
  vy *= drag
  // keep the heading in a tidy range so it never drifts to huge numbers
  if (angle > Math.PI) angle -= Math.PI * 2
  else if (angle < -Math.PI) angle += Math.PI * 2
  return { x: ship.x + vx * dt, y: ship.y + vy * dt, vx, vy, angle }
}

/** The heading a touch drag toward (tx, ty) should rotate the nose toward,
 * capped by the turn rate so it eases round rather than snapping. */
export function steerToward(ship: ShipState, tx: number, ty: number, dt: number): number {
  const desired = Math.atan2(ty - ship.y, tx - ship.x)
  const turn = Math.max(-SHIP_ROT_SPEED * dt, Math.min(SHIP_ROT_SPEED * dt, angleDelta(ship.angle, desired)))
  return ship.angle + turn
}
