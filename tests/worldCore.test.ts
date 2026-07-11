import { describe, it, expect } from 'vitest'
import {
  WORLD_SIZE, WORLD_PALETTE, inWorld, validColor,
  CooldownGate, createSeedBoard, encodeBoard, decodeBoard
} from '../realtime/world-core.mjs'

describe('the pixel world core', () => {
  it('validates coordinates and colors strictly', () => {
    expect(inWorld(0, 0)).toBe(true)
    expect(inWorld(WORLD_SIZE - 1, WORLD_SIZE - 1)).toBe(true)
    expect(inWorld(WORLD_SIZE, 0)).toBe(false)
    expect(inWorld(-1, 0)).toBe(false)
    expect(inWorld(1.5, 2)).toBe(false)
    expect(validColor(0)).toBe(true)
    expect(validColor(WORLD_PALETTE.length - 1)).toBe(true)
    expect(validColor(WORLD_PALETTE.length)).toBe(false)
    expect(validColor('4')).toBe(false)
  })

  it('rate-limits per key and lets others through', () => {
    const gate = new CooldownGate(5000)
    expect(gate.check('a', 1000)).toBe(0)
    expect(gate.check('a', 3000)).toBe(3000) // 3s left
    expect(gate.check('b', 3000)).toBe(0) // different visitor, no wait
    expect(gate.check('a', 6001)).toBe(0)
  })

  it('seeds a landscape that is not empty and fits the board', () => {
    const board = createSeedBoard()
    expect(board.length).toBe(WORLD_SIZE * WORLD_SIZE)
    const painted = board.filter((c) => c !== 0).length
    expect(painted).toBeGreaterThan(500)
    // every seeded value is a valid palette index
    expect(board.every((c) => c < WORLD_PALETTE.length)).toBe(true)
  })

  it('round-trips the board through base64', () => {
    const board = createSeedBoard()
    const decoded = decodeBoard(encodeBoard(board))
    expect(decoded.length).toBe(board.length)
    expect([...decoded]).toEqual([...board])
  })
})
