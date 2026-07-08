import { describe, it, expect } from 'vitest'
import { scrambleFrame } from '../app/composables/useTextScramble'

const rngZero = () => 0 // always picks the first glyph: '!'

describe('scrambleFrame', () => {
  it('starts as pure noise and ends as the real text', () => {
    expect(scrambleFrame('abc', 0, 10, rngZero)).toBe('!!!')
    expect(scrambleFrame('abc', 10, 10, rngZero)).toBe('abc')
  })

  it('settles characters left to right as frames advance', () => {
    // halfway: floor(5/10 * 4) = 2 characters settled
    expect(scrambleFrame('abcd', 5, 10, rngZero)).toBe('ab!!')
  })

  it('never scrambles spaces, so words stay separated', () => {
    expect(scrambleFrame('a b', 0, 10, rngZero)).toBe('! !')
  })

  it('only emits glyphs from the ascii-safe set', () => {
    const noise = scrambleFrame('hello world', 1, 40)
    for (const ch of noise.replace(/ /g, '')) {
      expect('!<>-_\\/[]{}=+*^?#$%&helloworld').toContain(ch)
    }
  })
})
