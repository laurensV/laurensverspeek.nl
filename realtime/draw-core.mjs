// The co-draw whiteboard's shared core: the palette, the ring-buffer size and
// stroke validation. Plain JS with JSDoc so the relay server (node) and the
// Nuxt client import the exact same rules — the server stays authoritative and
// the client just predicts its own strokes. Distinct from the pixel world:
// this is freehand line segments in normalized 0..1 space, not a fixed grid.

// a compact pen palette — the amber brand, a friendly spread, and an eraser
// (index 0 = the board background, so painting it "erases")
export const DRAW_COLORS = [
  '#14141a', // 0 board (eraser)
  '#e6e6e6', // 1 chalk
  '#ffba00', // 2 THE amber
  '#ff5d73', // 3 red
  '#41d6a0', // 4 green
  '#4aa8ff', // 5 blue
  '#c56bff', // 6 purple
  '#ff9f43'  // 7 orange
]

// how many recent segments the relay keeps and replays to a new joiner. A
// doodle board, not an archive — old strokes scroll out of the buffer.
export const MAX_STROKES = 1200

/** @param {unknown} v @returns {number} */
const clamp01 = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return NaN
  return n < 0 ? 0 : n > 1 ? 1 : n
}

/** @param {unknown} c */
export const validPen = (c) =>
  Number.isInteger(c) && /** @type {number} */ (c) >= 0 && /** @type {number} */ (c) < DRAW_COLORS.length

/**
 * Validate + clamp one raw stroke segment from the wire. Returns a clean
 * `{ x0, y0, x1, y1, c, sid }` (coords in [0,1], `sid` the drawer's pen-drag id
 * used to group segments for undo) or null when it can't be trusted — the
 * server never stores or broadcasts an unsanitized segment.
 * @param {any} raw
 * @returns {{ x0: number, y0: number, x1: number, y1: number, c: number, sid: number } | null}
 */
export const sanitizeStroke = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const x0 = clamp01(raw.x0)
  const y0 = clamp01(raw.y0)
  const x1 = clamp01(raw.x1)
  const y1 = clamp01(raw.y1)
  if ([x0, y0, x1, y1].some((n) => Number.isNaN(n))) return null
  if (!validPen(raw.c)) return null
  // sid groups a pen-drag; a missing/absurd one just can't be undone as a group
  const sid = Number.isInteger(raw.sid) && raw.sid >= 0 && raw.sid <= 0xffffffff ? raw.sid : 0
  return { x0, y0, x1, y1, c: raw.c, sid }
}
