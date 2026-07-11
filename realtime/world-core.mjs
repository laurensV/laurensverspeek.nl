// The Pixel World's shared core: board constants, validation, cooldown and
// the seed landscape. Plain JS with JSDoc so the relay server (node) and the
// Nuxt client import the exact same rules — the server stays authoritative,
// the client just predicts.

export const WORLD_SIZE = 128
export const WORLD_COOLDOWN_MS = 5000

// 16 colors: the amber brand front and center, then a friendly r/place-ish set
export const WORLD_PALETTE = [
  '#101014', // 0 near-black (background)
  '#ffffff', // 1 white
  '#8a8a92', // 2 gray
  '#3a3a46', // 3 dark gray
  '#ffba00', // 4 THE amber
  '#ff8c00', // 5 orange
  '#e94560', // 6 red/pink
  '#a55eea', // 7 purple
  '#3867d6', // 8 blue
  '#4bcffa', // 9 sky
  '#0be881', // 10 green
  '#1e7d4e', // 11 dark green
  '#f5deb3', // 12 sand
  '#8b5a2b', // 13 brown
  '#f78fb3', // 14 rose
  '#2c2c38'  // 15 slate
]

// Named plots: labelled regions the camera announces on entry. Room is left
// for visitors to claim more; these are the founding districts.
export const WORLD_PLOTS = [
  { name: 'the amber district', x0: 12, y0: 14, x1: 52, y1: 40 },
  { name: 'the terminal quarter', x0: 70, y0: 84, x1: 100, y1: 104 },
  { name: 'greenhill', x0: 20, y0: 72, x1: 44, y1: 104 },
  { name: 'the commons', x0: 52, y0: 44, x1: 96, y1: 82 }
]

/** @param {number} x @param {number} y @returns {string | null} */
export const plotAt = (x, y) => {
  for (const plot of WORLD_PLOTS) {
    if (x >= plot.x0 && x <= plot.x1 && y >= plot.y0 && y <= plot.y1) return plot.name
  }
  return null
}

/** @param {number} x @param {number} y */
export const inWorld = (x, y) =>
  Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < WORLD_SIZE && y >= 0 && y < WORLD_SIZE

/** @param {unknown} c */
export const validColor = (c) =>
  Number.isInteger(c) && /** @type {number} */ (c) >= 0 && /** @type {number} */ (c) < WORLD_PALETTE.length

/**
 * Per-key cooldown gate. The server keys it by connection; the offline client
 * keys it by 'me'. check() returns 0 when placement is allowed (and stamps),
 * or the remaining wait in ms.
 */
export class CooldownGate {
  /** @param {number} cooldownMs */
  constructor(cooldownMs = WORLD_COOLDOWN_MS) {
    this.cooldownMs = cooldownMs
    /** @type {Map<string | number, number>} */
    this.last = new Map()
  }

  /** @param {string | number} key @param {number} now */
  check(key, now) {
    const last = this.last.get(key) ?? -Infinity
    const wait = last + this.cooldownMs - now
    if (wait > 0) return Math.ceil(wait)
    this.last.set(key, now)
    return 0
  }
}

/** Browser-safe encode (btoa) with a node fallback. @param {Uint8Array} board */
export const encodeBoard = (board) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(board).toString('base64')
  let raw = ''
  for (const byte of board) raw += String.fromCharCode(byte)
  return btoa(raw)
}

/** Browser-safe decode (atob) with a node fallback. @param {string} data */
export const decodeBoard = (data) => {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(data, 'base64'))
  const raw = atob(data)
  const board = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) board[i] = raw.charCodeAt(i)
  return board
}

/**
 * The founding landscape: ground, a sun, a tree, the LV monogram and a little
 * amber prompt — enough that the world never feels empty, small enough that
 * visitors have all the room.
 */
export function createSeedBoard() {
  const board = new Uint8Array(WORLD_SIZE * WORLD_SIZE) // palette 0 everywhere
  /** @param {number} x @param {number} y @param {number} c */
  const px = (x, y, c) => {
    if (inWorld(x, y)) board[y * WORLD_SIZE + x] = c
  }
  /** @param {number} x0 @param {number} y0 @param {number} w @param {number} h @param {number} c */
  const rect = (x0, y0, w, h, c) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(x, y, c)
  }

  // rolling ground along the bottom
  for (let x = 0; x < WORLD_SIZE; x++) {
    const top = 104 + Math.round(Math.sin(x / 9) * 2)
    for (let y = top; y < WORLD_SIZE; y++) px(x, y, y > top + 3 ? 11 : 10)
  }
  // a sun with rays
  rect(100, 14, 8, 8, 4)
  px(99, 17, 4); px(108, 17, 4); px(103, 12, 4); px(103, 23, 4)
  // a tree on a hill
  rect(30, 88, 3, 12, 13)
  rect(25, 78, 13, 10, 11)
  rect(27, 74, 9, 5, 10)
  // the LV monogram, sky-high
  rect(18, 20, 3, 14, 4); rect(18, 32, 9, 3, 4) // L
  px(32, 20, 1); px(32, 21, 1); px(33, 22, 1); px(33, 23, 1); px(34, 24, 1); px(34, 25, 1)
  px(35, 26, 1); px(35, 27, 1); px(36, 28, 1); px(36, 29, 1); px(37, 30, 1); px(37, 31, 1)
  px(38, 32, 1); px(38, 33, 1); px(38, 34, 1)
  px(44, 20, 1); px(44, 21, 1); px(43, 22, 1); px(43, 23, 1); px(42, 24, 1); px(42, 25, 1)
  px(41, 26, 1); px(41, 27, 1); px(40, 28, 1); px(40, 29, 1); px(39, 30, 1); px(39, 31, 1)
  // a little terminal window on the ground, prompt included
  rect(74, 88, 22, 14, 15)
  rect(74, 88, 22, 3, 3)
  px(76, 89, 6); px(78, 89, 4); px(80, 89, 10)
  px(77, 94, 4); px(78, 95, 4); px(79, 96, 4); px(78, 97, 4); px(77, 98, 4)
  rect(82, 98, 5, 1, 4)
  return board
}
