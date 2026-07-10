import { describe, it, expect } from 'vitest'
import { matchApp, appCandidates, DESKTOP_APPS } from '../app/utils/desktopApps'

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
})
