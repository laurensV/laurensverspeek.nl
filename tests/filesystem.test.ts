import { describe, it, expect } from 'vitest'
import { parseRedirect, resolvePath, dirEntries, writeFileAt, expandGlob, expandFileArgs, formatLongListing, renamePath, movePath } from '~/utils/terminal/filesystem'
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

describe('renamePath', () => {
  const base = () => ({
    'a.txt': { dir: false, content: 'aa' },
    'b.txt': { dir: false, content: 'bb' },
    docs: { dir: true, content: '' },
    'docs/deep.txt': { dir: false, content: 'dd' }
  })

  it('renames a file in place', () => {
    const result = renamePath(base(), 'a.txt', 'renamed.txt')
    if ('error' in result) throw new Error(result.error)
    expect(result.files['renamed.txt']?.content).toBe('aa')
    expect(result.files['a.txt']).toBeUndefined()
  })

  it('renames a directory and carries its subtree', () => {
    const result = renamePath(base(), 'docs', 'papers')
    if ('error' in result) throw new Error(result.error)
    expect(result.files['papers']?.dir).toBe(true)
    expect(result.files['papers/deep.txt']?.content).toBe('dd')
    expect(result.files['docs/deep.txt']).toBeUndefined()
  })

  it('refuses collisions, slashes and empty names', () => {
    expect(renamePath(base(), 'a.txt', 'b.txt')).toHaveProperty('error')
    expect(renamePath(base(), 'a.txt', 'x/y')).toHaveProperty('error')
    expect(renamePath(base(), 'a.txt', '  ')).toHaveProperty('error')
    expect(renamePath(base(), 'ghost.txt', 'x')).toHaveProperty('error')
  })
})

describe('movePath', () => {
  const base = (): Filesystem => ({
    'a.txt': { dir: false, content: 'aa' },
    docs: { dir: true, content: '' },
    'docs/deep.txt': { dir: false, content: 'dd' },
    inbox: { dir: true, content: '' }
  })

  it('moves a file into a folder, keeping its basename', () => {
    const result = movePath(base(), 'a.txt', 'inbox')
    if ('error' in result) throw new Error(result.error)
    expect(result.files['inbox/a.txt']?.content).toBe('aa')
    expect(result.files['a.txt']).toBeUndefined()
    expect(result.origins).toEqual(['a.txt'])
  })

  it('moves a directory and carries its subtree', () => {
    const result = movePath(base(), 'docs', 'inbox')
    if ('error' in result) throw new Error(result.error)
    expect(result.files['inbox/docs']?.dir).toBe(true)
    expect(result.files['inbox/docs/deep.txt']?.content).toBe('dd')
    expect(result.files['docs/deep.txt']).toBeUndefined()
    expect(result.origins.sort()).toEqual(['docs', 'docs/deep.txt'])
  })

  it('moves to the home root (destDir "")', () => {
    const fs: Filesystem = { 'docs/note.txt': { dir: false, content: 'n' }, docs: { dir: true, content: '' } }
    const result = movePath(fs, 'docs/note.txt', '')
    if ('error' in result) throw new Error(result.error)
    expect(result.files['note.txt']?.content).toBe('n')
  })

  it('is a no-op when dropped on its own parent', () => {
    const result = movePath(base(), 'docs/deep.txt', 'docs')
    if ('error' in result) throw new Error(result.error)
    expect(result.origins).toEqual([])
    expect(result.files['docs/deep.txt']?.content).toBe('dd')
  })

  it('refuses moving into itself, into a descendant, and name collisions', () => {
    expect(movePath(base(), 'docs', 'docs')).toHaveProperty('error')
    expect(movePath(base(), 'docs', 'docs/deep.txt')).toHaveProperty('error')
    const collide: Filesystem = { ...base(), 'inbox/a.txt': { dir: false, content: 'x' } }
    expect(movePath(collide, 'a.txt', 'inbox')).toHaveProperty('error')
    expect(movePath(base(), 'ghost.txt', 'inbox')).toHaveProperty('error')
  })
})
