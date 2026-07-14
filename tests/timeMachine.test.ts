import { describe, it, expect } from 'vitest'
import { resolveDeployRef, releaseCommits } from '../app/composables/useTimeMachine'
import type { Deploy } from '../app/composables/useTimeMachine'

// deploys are newest-first, like the baked manifest
const deploys: Deploy[] = [
  { sha: 'aaaaaaaaaaaa', date: '2026-07-14', source: '5d12e23', subject: 'newest', tag: 'v2.0.4' },
  { sha: 'bbbbbbbbbbbb', date: '2026-07-10', source: '2222222', subject: 'middle' },
  { sha: 'cccccccccccc', date: '2020-09-10', source: '0000000', subject: 'oldest' }
]

// the full git log is newest-first too; only some commits were deploy points
const commits = [
  { hash: '5d12e23' }, // 0  ← deploy 0 (newest)
  { hash: 'aaa1111' }, // 1    non-deploy, newer than deploy 1
  { hash: '2222222' }, // 2  ← deploy 1
  { hash: 'bbb3333' }, // 3    non-deploy, between deploy 1 and 2
  { hash: '0000000' }, // 4  ← deploy 2 (oldest)
  { hash: 'ccc5555' } //  5    non-deploy, ancestor of the oldest deploy
]

describe('resolveDeployRef', () => {
  it('returns the present for branch names and empties', () => {
    for (const ref of ['', 'main', 'master', 'HEAD', '-', 'present']) {
      expect(resolveDeployRef(ref, deploys, commits)).toBe('present')
    }
  })

  it('matches an exact source or gh-pages sha', () => {
    expect(resolveDeployRef('5d12e23', deploys, commits)).toBe(deploys[0])
    expect(resolveDeployRef('aaaaaa', deploys, commits)).toBe(deploys[0]) // gh-pages sha prefix
    expect(resolveDeployRef('2222222', deploys, commits)).toBe(deploys[1])
  })

  it('matches a release tag / version, case-insensitively', () => {
    expect(resolveDeployRef('v2.0.4', deploys, commits)).toBe(deploys[0])
    expect(resolveDeployRef('V2.0.4', deploys, commits)).toBe(deploys[0])
    expect(resolveDeployRef('v9.9.9', deploys, commits)).toBeNull()
  })

  it('resolves HEAD~n to n deploys back', () => {
    expect(resolveDeployRef('HEAD~0', deploys, commits)).toBe(deploys[0])
    expect(resolveDeployRef('HEAD~1', deploys, commits)).toBe(deploys[1])
    expect(resolveDeployRef('~2', deploys, commits)).toBe(deploys[2])
    expect(resolveDeployRef('HEAD~9', deploys, commits)).toBeNull()
  })

  it('resolves a date to the version live on that day', () => {
    expect(resolveDeployRef('2026-07-14', deploys, commits)).toBe(deploys[0])
    expect(resolveDeployRef('2026-07-12', deploys, commits)).toBe(deploys[1]) // after mid, before newest
    expect(resolveDeployRef('2021-01-01', deploys, commits)).toBe(deploys[2])
  })

  it('maps a non-deploy commit to the deploy that shipped it', () => {
    // newer than deploy 1 → shipped by deploy 0
    expect(resolveDeployRef('aaa1111', deploys, commits)).toBe(deploys[0])
    // between deploy 1 and 2 → shipped by deploy 1
    expect(resolveDeployRef('bbb3333', deploys, commits)).toBe(deploys[1])
    // ancestor of the oldest deploy → shipped by deploy 2
    expect(resolveDeployRef('ccc5555', deploys, commits)).toBe(deploys[2])
  })

  it('falls back to the newest build for a commit newer than every deploy', () => {
    const laggingDeploys = deploys.slice(1) // newest deploy not yet cut
    // '5d12e23' (commits[0]) is newer than any deploy in laggingDeploys
    expect(resolveDeployRef('5d12e23', laggingDeploys, commits)).toBe(laggingDeploys[0])
  })

  it('returns null for a ref that is neither a deploy nor a known commit', () => {
    expect(resolveDeployRef('zzzzzzz', deploys, commits)).toBeNull()
    // with no log to consult, an unknown hash simply misses
    expect(resolveDeployRef('deadbee', deploys)).toBeNull()
  })
})

describe('releaseCommits', () => {
  it('groups each release as the commits from its tip to the next-older deploy', () => {
    const map = releaseCommits(deploys, commits)
    // a deploy batches every commit since the previous deploy, not just its tip
    expect(map.get(deploys[0]!.source)!.map((c) => c.hash)).toEqual(['5d12e23', 'aaa1111'])
    expect(map.get(deploys[1]!.source)!.map((c) => c.hash)).toEqual(['2222222', 'bbb3333'])
    // the oldest deploy sweeps in every remaining ancestor commit
    expect(map.get(deploys[2]!.source)!.map((c) => c.hash)).toEqual(['0000000', 'ccc5555'])
  })

  it('partitions the whole log across releases with no gaps or overlaps', () => {
    const map = releaseCommits(deploys, commits)
    const total = [...map.values()].reduce((sum, list) => sum + list.length, 0)
    expect(total).toBe(commits.length)
  })

  it('is empty for a deploy whose tip is missing from the log', () => {
    const orphan: Deploy = { sha: 'ffff', date: '2019-01-01', source: 'nope999', subject: 'orphan' }
    const map = releaseCommits([...deploys, orphan], commits)
    expect(map.get('nope999')).toEqual([])
  })
})

describe('resolveDeployRef with a live/current entry', () => {
  // the manifest prepends a synthetic HEAD entry (no gh-pages sha) for the live build
  const live: Deploy = { sha: '', date: '2026-07-15', source: '9999999', subject: 'live', current: true, tag: 'v2.0.7' }
  const withLive = [live, ...deploys]
  const liveCommits = [{ hash: '9999999' }, ...commits]

  it('resolves the live version (tag or hash) to the present, not a snapshot', () => {
    expect(resolveDeployRef('v2.0.7', withLive, liveCommits)).toBe('present')
    expect(resolveDeployRef('9999999', withLive, liveCommits)).toBe('present')
  })

  it('still resolves older releases to their snapshot', () => {
    expect(resolveDeployRef('v2.0.4', withLive, liveCommits)).toBe(deploys[0])
    expect(resolveDeployRef('2222222', withLive, liveCommits)).toBe(deploys[1])
  })
})
