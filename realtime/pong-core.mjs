// Shared, dependency-free logic for online pong, imported by BOTH the relay
// (authoritative simulation) and the client (rendering constants). The board
// matches the terminal's solo pong so the two look identical.

export const PONG_W = 41
export const PONG_H = 13
export const PONG_PADDLE = 3
export const PONG_WIN = 5
export const PONG_TICK_MS = 75

/**
 * @typedef {{
 *   ballX: number, ballY: number, vx: number, vy: number,
 *   leftY: number, rightY: number,
 *   leftScore: number, rightScore: number,
 *   rally: number
 * }} PongState
 */

/** @returns {PongState} */
export function createPongState() {
  const paddleY = Math.floor(PONG_H / 2) - 1
  return {
    ballX: PONG_W / 2,
    ballY: PONG_H / 2,
    vx: Math.random() > 0.5 ? 1 : -1,
    vy: Math.random() > 0.5 ? 0.5 : -0.5,
    leftY: paddleY,
    rightY: paddleY,
    leftScore: 0,
    rightScore: 0,
    rally: 0
  }
}

/** Clamp a requested paddle row to the board. @param {number} y @returns {number} */
export const clampPaddle = (y) =>
  Math.max(0, Math.min(PONG_H - PONG_PADDLE, Math.round(Number(y) || 0)))

/** @param {PongState} state @param {'l' | 'r'} side @param {number} y */
export function movePaddle(state, side, y) {
  if (side === 'l') state.leftY = clampPaddle(y)
  else state.rightY = clampPaddle(y)
}

/** @param {PongState} state @param {number} paddleY @returns {boolean} */
function paddleHit(state, paddleY) {
  const y = Math.round(state.ballY)
  if (y < paddleY || y >= paddleY + PONG_PADDLE) return false
  // deflection angle depends on where the ball meets the paddle
  state.vy = (state.ballY - (paddleY + PONG_PADDLE / 2)) * 0.6
  state.rally++
  return true
}

/** @param {PongState} state @param {1 | -1} towards */
function resetBall(state, towards) {
  state.ballX = PONG_W / 2
  state.ballY = PONG_H / 2
  state.vx = towards
  state.vy = Math.random() > 0.5 ? 0.5 : -0.5
  state.rally = 0
}

/**
 * Advance the match one tick. Returns what happened:
 * null | 'point-l' | 'point-r' | 'win-l' | 'win-r'.
 * @param {PongState} state
 * @returns {null | 'point-l' | 'point-r' | 'win-l' | 'win-r'}
 */
export function stepPong(state) {
  // a building rally quickens the ball (same feel as the solo game's ticker)
  const speed = Math.min(1.8, 1 + state.rally * 0.08)
  state.ballX += state.vx * speed
  state.ballY += state.vy
  // wall bounce
  if (state.ballY <= 0) {
    state.ballY = 0
    state.vy = Math.abs(state.vy)
  } else if (state.ballY >= PONG_H - 1) {
    state.ballY = PONG_H - 1
    state.vy = -Math.abs(state.vy)
  }
  // paddles / scoring
  if (state.vx < 0 && Math.round(state.ballX) <= 1) {
    if (paddleHit(state, state.leftY)) {
      state.vx = 1
      state.ballX = 2
    } else {
      state.rightScore++
      if (state.rightScore >= PONG_WIN) return 'win-r'
      resetBall(state, -1)
      return 'point-r'
    }
  } else if (state.vx > 0 && Math.round(state.ballX) >= PONG_W - 2) {
    if (paddleHit(state, state.rightY)) {
      state.vx = -1
      state.ballX = PONG_W - 3
    } else {
      state.leftScore++
      if (state.leftScore >= PONG_WIN) return 'win-l'
      resetBall(state, 1)
      return 'point-l'
    }
  }
  return null
}
