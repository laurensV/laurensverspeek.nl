import { describe, it, expect } from 'vitest'
import { parseRedirect, resolvePath, dirEntries, writeFileAt, expandGlob, expandFileArgs, formatLongListing } from '~/utils/terminal/filesystem'
import type { Filesystem } from '~/utils/terminal/filesystem'

describe('writeFileAt', () => {
  it('writes a new file at the current directory', () => {
    const res = writeFileAt({}, '', 'notes.txt', 'hello')
    expect('files' in res && res.files['notes.txt']).toEqual({ dir: false, content: 'hello' })
  })

  it('overwrites by default and appends with the flag', () => {
    const base: Filesystem = { log: { dir: false, content: 'a' } }
    expect((writeFileAt(base, '', 'log', 'b') as { files: Filesystem }).files.log!.content).toBe('b')
    expect((writeFileAt(base, '', 'log', 'b', true) as { files: Filesystem }).files.log!.content).toBe('a\nb')
  })

  it('refuses to write over a directory', () => {
    const res = writeFileAt({ docs: { dir: true, content: '' } }, '', 'docs', 'x')
    expect('error' in res && res.error).toContain('Is a directory')
  })

  it('errors when the parent directory is missing', () => {
    const res = writeFileAt({}, '', 'nope/file.txt', 'x')
    expect('error' in res && res.error).toContain('No such file or directory')
  })
})

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

describe('expandGlob', () => {
  const fs: Filesystem = {
    'a.txt': { dir: false, content: '' },
    'b.txt': { dir: false, content: '' },
    'c.md': { dir: false, content: '' },
    'notes': { dir: true, content: '' },
    'notes/d.txt': { dir: false, content: '' },
    'notes/deep': { dir: true, content: '' },
    'notes/deep/e.txt': { dir: false, content: '' }
  }

  it('matches within a single path segment only', () => {
    expect(expandGlob(fs, '', '*.txt')).toEqual(['a.txt', 'b.txt'])
    expect(expandGlob(fs, '', 'notes/*.txt')).toEqual(['notes/d.txt'])
    // no recursive descent: * never crosses a slash
    expect(expandGlob(fs, '', '*')).toEqual(['a.txt', 'b.txt', 'c.md', 'notes'])
  })

  it('resolves against the cwd', () => {
    expect(expandGlob(fs, 'notes', '*.txt')).toEqual(['notes/d.txt'])
    expect(expandGlob(fs, 'notes', 'deep/*')).toEqual(['notes/deep/e.txt'])
  })

  it('escapes regex metacharacters in the pattern', () => {
    expect(expandGlob(fs, '', 'a.txt')).toEqual(['a.txt'])
    expect(expandGlob(fs, '', 'a+txt')).toEqual([])
  })
})

describe('expandFileArgs', () => {
  const fs: Filesystem = {
    'a.txt': { dir: false, content: '' },
    'b.txt': { dir: false, content: '' }
  }

  it('replaces glob args with home-absolute matches', () => {
    expect(expandFileArgs(fs, '', ['*.txt', 'backup'])).toEqual(['/a.txt', '/b.txt', 'backup'])
  })

  it('keeps flags and non-matching globs literal', () => {
    expect(expandFileArgs(fs, '', ['-rf', '*.nope'])).toEqual(['-rf', '*.nope'])
  })
})

describe('formatLongListing', () => {
  it('renders perms, links, size and a total', () => {
    const rows = formatLongListing([
      { name: 'a.txt', dir: false, size: 12 },
      { name: 'stuff', dir: true, size: 0 }
    ])
    expect(rows[0]).toMatch(/^total \d+/)
    expect(rows[1]).toContain('-rw-r--r--')
    expect(rows[1]).toContain('a.txt')
    expect(rows[2]).toContain('drwxr-xr-x')
    expect(rows[2]).toContain('stuff/')
  })

  it('handles an empty directory', () => {
    expect(formatLongListing([])).toEqual(['total 0'])
  })
})
