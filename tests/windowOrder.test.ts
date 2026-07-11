import { describe, it, expect } from 'vitest'
import { nextInCycle, resizeRect, clampDragPosition, spawnPosition } from '../app/utils/windowOrder'

const win = (id: string, z: number, minimized = false) => ({ id, z, minimized })

describe('nextInCycle', () => {
  const stack = [win('a', 1), win('b', 3), win('c', 2)]

  it('steps down the stack and wraps around', () => {
    // top is b (z=3); +1 wraps past the end back to the bottom window a
    expect(nextInCycle(stack, 1)!.id).toBe('a')
    expect(nextInCycle(stack, -1)!.id).toBe('c')
  })

  it('skips minimized windows', () => {
    expect(nextInCycle([win('a', 1, true), win('b', 3), win('c', 2)], 1)!.id).toBe('c')
  })

  it('handles one or zero open windows', () => {
    expect(nextInCycle([win('a', 1)], 1)!.id).toBe('a')
    expect(nextInCycle([win('a', 1, true)], 1)).toBeNull()
    expect(nextInCycle([], 1)).toBeNull()
  })
})

describe('resizeRect', () => {
  const start = { x: 100, y: 80, w: 400, h: 300 }

  it('grows east/south without moving the origin', () => {
    expect(resizeRect(start, 'se', 50, 20, 280, 140)).toEqual({ x: 100, y: 80, width: 450, height: 320 })
  })

  it('shifts the origin when resizing west/north so the far edge stays put', () => {
    const rect = resizeRect(start, 'nw', 30, 40, 280, 140)
    expect(rect).toEqual({ x: 130, y: 120, width: 370, height: 260 })
    // far edges unchanged
    expect(rect.x + rect.width).toBe(start.x + start.w)
    expect(rect.y + rect.height).toBe(start.y + start.h)
  })

  it('clamps to the minimum size, re-anchoring the west edge', () => {
    const rect = resizeRect(start, 'w', 390, 0, 280, 140)
    expect(rect.width).toBe(280)
    expect(rect.x).toBe(100 + (400 - 280))
  })
})

describe('clampDragPosition', () => {
  it('follows the pointer minus the grab offset', () => {
    expect(clampDragPosition(500, 300, { x: 40, y: 10 }, 1280, 800)).toEqual({ x: 460, y: 290 })
  })

  it('keeps part of the window reachable at every screen edge', () => {
    expect(clampDragPosition(-500, -500, { x: 0, y: 0 }, 1280, 800)).toEqual({ x: 0, y: 0 })
    expect(clampDragPosition(5000, 5000, { x: 0, y: 0 }, 1280, 800)).toEqual({ x: 1160, y: 720 })
  })
})

describe('spawnPosition', () => {
  it('cascades new windows and caps x at a third of the viewport', () => {
    expect(spawnPosition(0, 1280, 800)).toEqual({ x: 90, y: 70 })
    expect(spawnPosition(2, 1280, 800)).toEqual({ x: 158, y: 138 })
    expect(spawnPosition(20, 1280, 800).x).toBe(1280 / 3)
  })

  it('caps y so a late window never spawns with its titlebar off the bottom', () => {
    // 20 windows would put y at 750; clamp keeps it within viewportH − 220
    expect(spawnPosition(20, 1280, 700).y).toBe(700 - 220)
    // a tiny viewport still yields a sane minimum
    expect(spawnPosition(20, 1280, 200).y).toBe(70)
  })
})
