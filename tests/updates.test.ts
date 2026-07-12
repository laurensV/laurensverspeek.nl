import { describe, it, expect } from 'vitest'
import { commitsSinceMarker } from '../app/utils/updates'
import type { GitCommit } from '../app/utils/terminal/gitLog'

const log = (...hashes: string[]): GitCommit[] =>
  hashes.map((hash) => ({ hash, subject: hash, date: '2026-07-12', body: '', files: [] } as unknown as GitCommit))

describe('commitsSinceMarker', () => {
  const commits = log('e', 'd', 'c', 'b', 'a') // newest-first

  it('counts commits since the marker (its index in the log)', () => {
    expect(commitsSinceMarker(commits, 'e')).toBe(0) // marker is newest → nothing since
    expect(commitsSinceMarker(commits, 'c')).toBe(2) // e, d landed since c
    expect(commitsSinceMarker(commits, 'a')).toBe(4) // whole log since the oldest
  })

  it('returns -1 with no marker or an unknown marker', () => {
    expect(commitsSinceMarker(commits, null)).toBe(-1)
    expect(commitsSinceMarker(commits, undefined)).toBe(-1)
    expect(commitsSinceMarker(commits, 'zzz')).toBe(-1)
  })
})
