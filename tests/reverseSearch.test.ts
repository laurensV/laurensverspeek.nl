import { describe, it, expect } from 'vitest'
import { searchHistory, pickMatch, matchPosition } from '../app/utils/terminal/reverseSearch'

const history = ['ls', 'git log', 'cat readme.md', 'git show HEAD', 'help']

describe('searchHistory', () => {
  it('filters case-insensitively and keeps history order', () => {
    expect(searchHistory(history, 'GIT')).toEqual(['git log', 'git show HEAD'])
  })

  it('returns nothing for an empty query', () => {
    expect(searchHistory(history, '')).toEqual([])
  })
})

describe('pickMatch', () => {
  const matches = ['git log', 'git show HEAD']

  it('starts at the newest match and walks back, wrapping', () => {
    expect(pickMatch(matches, 0)).toBe('git show HEAD')
    expect(pickMatch(matches, 1)).toBe('git log')
    expect(pickMatch(matches, 2)).toBe('git show HEAD') // wrapped
  })

  it('is empty with no matches', () => {
    expect(pickMatch([], 5)).toBe('')
  })
})

describe('matchPosition', () => {
  it('reports the 1-based cycling position', () => {
    expect(matchPosition(2, 0)).toBe(1)
    expect(matchPosition(2, 1)).toBe(2)
    expect(matchPosition(2, 2)).toBe(1)
    expect(matchPosition(0, 3)).toBe(0)
  })
})
