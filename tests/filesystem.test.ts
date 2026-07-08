import { describe, it, expect } from 'vitest'
import { parseRedirect, resolvePath, dirEntries } from '~/utils/terminal/filesystem'
import type { Filesystem } from '~/utils/terminal/filesystem'

describe('parseRedirect', () => {
  it('returns the joined text and no file when there is no redirect', () => {
    expect(parseRedirect(['hello', 'world'])).toEqual({ text: 'hello world', file: null })
  })

  it('splits a spaced redirect', () => {
    expect(parseRedirect(['hi', 'there', '>', 'notes.txt'])).toEqual({ text: 'hi there', file: 'notes.txt' })
  })

  it('splits an attached redirect', () => {
    expect(parseRedirect(['hi', '>notes.txt'])).toEqual({ text: 'hi', file: 'notes.txt' })
  })

  it('handles a redirect with no preceding text', () => {
    expect(parseRedirect(['>', 'empty'])).toEqual({ text: '', file: 'empty' })
  })

  it('treats a dangling > as no file', () => {
    expect(parseRedirect(['hi', '>'])).toEqual({ text: 'hi', file: null })
  })
})

describe('resolvePath', () => {
  it('resolves relative names against the current directory', () => {
    expect(resolvePath('', 'notes')).toBe('notes')
    expect(resolvePath('notes', 'todo.txt')).toBe('notes/todo.txt')
    expect(resolvePath('a/b', 'c')).toBe('a/b/c')
  })

  it('handles . and ..', () => {
    expect(resolvePath('notes/sub', '..')).toBe('notes')
    expect(resolvePath('a', '.')).toBe('a')
    expect(resolvePath('a/b', '../../x')).toBe('x')
    expect(resolvePath('', '..')).toBe('')
  })

  it('treats ~ and leading / as home-absolute', () => {
    expect(resolvePath('notes', '~')).toBe('')
    expect(resolvePath('notes', '/other')).toBe('other')
    expect(resolvePath('deep/dir', '~/top')).toBe('top')
  })
})

describe('dirEntries', () => {
  const fs: Filesystem = {
    notes: { dir: true, content: '' },
    'notes/todo.txt': { dir: false, content: 'x' },
    'notes/sub': { dir: true, content: '' },
    'readme.md': { dir: false, content: 'hi' }
  }

  it('lists only the direct children of home', () => {
    expect(dirEntries(fs, '').map((e) => e.name).sort()).toEqual(['notes', 'readme.md'])
  })

  it('lists the direct children of a subdirectory', () => {
    expect(dirEntries(fs, 'notes').map((e) => e.name).sort()).toEqual(['sub', 'todo.txt'])
  })

  it('reports which entries are directories', () => {
    const entries = dirEntries(fs, 'notes')
    expect(entries.find((e) => e.name === 'sub')?.dir).toBe(true)
    expect(entries.find((e) => e.name === 'todo.txt')?.dir).toBe(false)
  })
})
