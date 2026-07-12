import { describe, it, expect } from 'vitest'
import {
  createPongState, stepPong, movePaddle, clampPaddle,
  PONG_W, PONG_H, PONG_PADDLE, PONG_WIN
} from '../realtime/pong-core.mjs'
import type { PongState } from '../realtime/pong-core.mjs'

describe('pong core', () => {
  it('creates a centered match', () => {
    const state = createPongState()
    expect(state.ballX).toBe(PONG_W / 2)
    expect(state.leftScore).toBe(0)
    expect(Math.abs(state.vx)).toBe(1)
  })

  it('clamps paddle moves to the board', () => {
    expect(clampPaddle(-5)).toBe(0)
    expect(clampPaddle(999)).toBe(PONG_H - PONG_PADDLE)
    const state = createPongState()
    movePaddle(state, 'l', -10)
    expect(state.leftY).toBe(0)
    movePaddle(state, 'r', 100)
    expect(state.rightY).toBe(PONG_H - PONG_PADDLE)
  })

  it('bounces off the top wall', () => {
    const state = createPongState()
    state.ballY = 0.2
    state.vy = -0.5
    state.vx = 1
    state.ballX = 10
    stepPong(state)
    expect(state.vy).toBeGreaterThan(0)
  })

  it('a missed left paddle scores for the right', () => {
    const state = createPongState()
    state.vx = -1
    state.ballX = 2
    state.ballY = 0
    state.leftY = PONG_H - PONG_PADDLE // paddle far away from the ball
    expect(stepPong(state)).toBe('point-r')
    expect(state.rightScore).toBe(1)
    expect(state.ballX).toBe(PONG_W / 2) // ball reset
  })

  it('a paddle in the way returns the ball and builds the rally', () => {
    const state = createPongState()
    state.vx = -1
    state.ballX = 2
    state.ballY = state.leftY + 1
    expect(stepPong(state)).toBeNull()
    expect(state.vx).toBe(1)
    expect(state.rally).toBe(1)
  })

  it('reaching the winning score ends the match', () => {
    const state: PongState = { ...createPongState(), rightScore: PONG_WIN - 1 }
    state.vx = -1
    state.ballX = 2
    state.ballY = 0
    state.leftY = PONG_H - PONG_PADDLE
    expect(stepPong(state)).toBe('win-r')
  })
})
