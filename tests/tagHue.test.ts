import { describe, it, expect } from 'vitest'
import { tagHue } from '../app/utils/tagHue'

describe('tagHue', () => {
  it('is stable and case-insensitive', () => {
    expect(tagHue('games')).toBe(tagHue('games'))
    expect(tagHue('Games')).toBe(tagHue('games'))
  })

  it('stays within the hue circle', () => {
    for (const tag of ['games', 'typescript', 'terminal', 'canvas', 'x']) {
      const hue = tagHue(tag)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })

  it('spreads different tags to different hues (for our real tags)', () => {
    const hues = ['games', 'typescript', 'terminal', 'canvas'].map(tagHue)
    expect(new Set(hues).size).toBe(hues.length)
  })
})
