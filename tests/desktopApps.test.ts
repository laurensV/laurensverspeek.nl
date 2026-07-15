import { describe, it, expect } from 'vitest'
import { matchApp, appCandidates, searchApps, DESKTOP_APPS } from '../app/utils/desktopApps'

describe('run-dialog app matching', () => {
  it('matches exact ids first', () => {
    expect(matchApp('files')?.id).toBe('files')
    expect(matchApp('calc')?.id).toBe('calc')
  })

  it('matches labels and prefixes case-insensitively', () => {
    expect(matchApp('CALCULATOR')?.id).toBe('calc')
    expect(matchApp('recycle bin')?.id).toBe('trash')
    expect(matchApp('mine')?.id).toBe('minesweeper')
  })

  it('returns null for nonsense and empty queries', () => {
    expect(matchApp('doom')).toBeNull()
    expect(matchApp('   ')).toBeNull()
  })

  it('lists prefix candidates for completion', () => {
    const hits = appCandidates('c')
    expect(hits).toContain('calc')
    expect(hits).toContain('clock')
    expect(appCandidates('zzz')).toEqual([])
  })

  it('every registered app is launchable by its own id', () => {
    for (const app of DESKTOP_APPS) {
      expect(matchApp(app.id)?.id).toBe(app.id)
    }
  })

  it('falls back to a substring match so it agrees with the start-menu search', () => {
    // 'machine' is a substring, not a prefix — before the shared searchApps
    // fallback the start menu launched Time Machine while matchApp returned null
    expect(matchApp('machine')?.id).toBe('timemachine')
    expect(matchApp('exe')?.id).toBe('minesweeper')
  })
})

describe('searchApps (shared start-menu / launcher filter)', () => {
  it('matches id or label as a substring', () => {
    expect(searchApps('machine').map((a) => a.id)).toContain('timemachine')
    expect(searchApps('time').map((a) => a.id)).toContain('timemachine')
    expect(searchApps('exe').map((a) => a.id)).toContain('minesweeper')
  })

  it('excludes logout and empty queries', () => {
    expect(searchApps('logout')).toEqual([])
    expect(searchApps('   ')).toEqual([])
  })

  it('agrees with matchApp on the first hit', () => {
    for (const q of ['machine', 'time', 'calc', 'files']) {
      expect(matchApp(q)?.id).toBe(searchApps(q)[0]?.id)
    }
  })
})
