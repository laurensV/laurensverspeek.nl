import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClickArmer, vibeCursor, PRESENCE, LANGS } from '~/composables/useStatusBarEggs'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createClickArmer', () => {
  it('arms after the threshold of rapid clicks and resets', () => {
    const onArm = vi.fn()
    const armer = createClickArmer(5, 1500, onArm)
    for (let i = 0; i < 5; i++) armer.click()
    expect(onArm).toHaveBeenCalledTimes(1)
    // the counter reset: five more clicks arm again
    for (let i = 0; i < 5; i++) armer.click()
    expect(onArm).toHaveBeenCalledTimes(2)
  })

  it('slow clicks never arm', () => {
    const onArm = vi.fn()
    const armer = createClickArmer(3, 1000, onArm)
    for (let i = 0; i < 6; i++) {
      armer.click()
      vi.advanceTimersByTime(1200)
    }
    expect(onArm).not.toHaveBeenCalled()
  })
})

describe('vibeCursor', () => {
  it('derives a stable, bounded position from the path', () => {
    const { line, column } = vibeCursor('/blog')
    expect(vibeCursor('/blog')).toEqual({ line, column })
    expect(line).toBeGreaterThanOrEqual(1)
    expect(line).toBeLessThanOrEqual(120)
    expect(column).toBeGreaterThanOrEqual(1)
    expect(column).toBeLessThanOrEqual(40)
    expect(vibeCursor('/projects')).not.toEqual(vibeCursor('/'))
  })
})

describe('status bar catalogs', () => {
  it('presence entries all carry a label and a color', () => {
    expect(PRESENCE.length).toBeGreaterThanOrEqual(3)
    for (const entry of PRESENCE) {
      expect(entry.label).toBeTruthy()
      expect(entry.color).toContain('var(')
    }
    expect(LANGS).toContain('Vue')
  })
})
