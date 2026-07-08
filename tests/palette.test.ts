import { describe, it, expect } from 'vitest'
import { fuzzyScore, highlightLabel } from '~/composables/useCommandPalette'

describe('fuzzyScore', () => {
  it('scores a contiguous substring higher than a scattered subsequence', () => {
    const sub = fuzzyScore('res', 'resume')
    const scattered = fuzzyScore('rsm', 'resume')
    expect(sub).toBeGreaterThan(scattered)
    expect(scattered).toBeGreaterThan(0)
  })

  it('returns 0 when the query is not a subsequence', () => {
    expect(fuzzyScore('xyz', 'resume')).toBe(0)
  })

  it('treats an empty query as a neutral match', () => {
    expect(fuzzyScore('', 'anything')).toBe(1)
  })
})

describe('highlightLabel', () => {
  it('returns one unmatched segment for an empty query', () => {
    expect(highlightLabel('', 'Projects')).toEqual([{ text: 'Projects', match: false }])
  })

  it('highlights a contiguous, case-insensitive substring', () => {
    expect(highlightLabel('res', 'CV / Resume')).toEqual([
      { text: 'CV / ', match: false },
      { text: 'Res', match: true },
      { text: 'ume', match: false }
    ])
  })

  it('falls back to highlighting a subsequence', () => {
    expect(highlightLabel('cvr', 'CV / Resume')).toEqual([
      { text: 'CV', match: true },
      { text: ' / ', match: false },
      { text: 'R', match: true },
      { text: 'esume', match: false }
    ])
  })

  it('does not highlight when the query only matched keywords (not the label)', () => {
    expect(highlightLabel('zzz', 'Home')).toEqual([{ text: 'Home', match: false }])
  })

  it('reassembles to the original label', () => {
    const label = 'Boot lvOS desktop'
    const joined = highlightLabel('lvos', label).map((s) => s.text).join('')
    expect(joined).toBe(label)
  })
})
