import { describe, it, expect } from 'vitest'
import { expandHistory } from '../app/utils/terminal/history'

const history = ['ls', 'git log', 'echo hi > a.txt', 'git show HEAD']

describe('expandHistory', () => {
  it('!! repeats the last command', () => {
    expect(expandHistory('!!', history)).toEqual({ expanded: 'git show HEAD', changed: true })
  })

  it('!n picks the 1-based history entry, matching the history listing', () => {
    expect(expandHistory('!2', history)).toEqual({ expanded: 'git log', changed: true })
  })

  it('!prefix finds the most recent match', () => {
    expect(expandHistory('!git', history)).toEqual({ expanded: 'git show HEAD', changed: true })
    expect(expandHistory('!ls', history)).toEqual({ expanded: 'ls', changed: true })
  })

  it('expands as a token inside a longer line', () => {
    expect(expandHistory('sudo !!', history)).toEqual({ expanded: 'sudo git show HEAD', changed: true })
  })

  it('leaves non-leading bangs and plain commands alone', () => {
    expect(expandHistory('echo hi!', history)).toEqual({ expanded: 'echo hi!', changed: false })
    expect(expandHistory('figlet wow', history)).toEqual({ expanded: 'figlet wow', changed: false })
  })

  it('reports unmatched events like bash', () => {
    expect(expandHistory('!nope', history)).toEqual({ error: 'lvsh: !nope: event not found' })
    expect(expandHistory('!!', [])).toEqual({ error: 'lvsh: !!: event not found' })
    expect(expandHistory('!99', history)).toEqual({ error: 'lvsh: !99: event not found' })
  })
})
