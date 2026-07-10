import { describe, it, expect } from 'vitest'
import { removeToTrash, restoreEntry, entrySize, isTrashEntries } from '../app/utils/trash'
import type { Filesystem } from '../app/utils/terminal/filesystem'

const T0 = 1_750_000_000_000

const fs = (): Filesystem => ({
  'notes.txt': { dir: false, content: 'hello' },
  work: { dir: true, content: '' },
  'work/todo.txt': { dir: false, content: 'ship it' },
  'work/deep': { dir: true, content: '' },
  'work/deep/secret.txt': { dir: false, content: 'shh' }
})

describe('trash', () => {
  it('bundles a single file out of the filesystem', () => {
    const result = removeToTrash(fs(), 'notes.txt', 1, T0)!
    expect(result.files['notes.txt']).toBeUndefined()
    expect(result.entry.name).toBe('notes.txt')
    expect(result.entry.dir).toBe(false)
    expect(Object.keys(result.entry.nodes)).toEqual(['notes.txt'])
  })

  it('bundles a directory with its whole subtree', () => {
    const result = removeToTrash(fs(), 'work', 2, T0)!
    expect(Object.keys(result.files)).toEqual(['notes.txt'])
    expect(result.entry.dir).toBe(true)
    expect(Object.keys(result.entry.nodes).sort()).toEqual([
      'work', 'work/deep', 'work/deep/secret.txt', 'work/todo.txt'
    ])
  })

  it('returns null for a path that does not exist', () => {
    expect(removeToTrash(fs(), 'ghost.txt', 3, T0)).toBeNull()
  })

  it('restores an entry, re-creating missing parents', () => {
    const removed = removeToTrash(fs(), 'work/deep/secret.txt', 4, T0)!
    // the parent dirs vanish too before the restore
    const bare: Filesystem = { 'notes.txt': removed.files['notes.txt']! }
    const restored = restoreEntry(bare, removed.entry)
    expect(restored['work']?.dir).toBe(true)
    expect(restored['work/deep']?.dir).toBe(true)
    expect(restored['work/deep/secret.txt']?.content).toBe('shh')
  })

  it('never clobbers a file recreated after the delete', () => {
    const removed = removeToTrash(fs(), 'notes.txt', 5, T0)!
    const withNew: Filesystem = { ...removed.files, 'notes.txt': { dir: false, content: 'brand new' } }
    const restored = restoreEntry(withNew, removed.entry)
    expect(restored['notes.txt']?.content).toBe('brand new')
  })

  it('sizes entries readably and validates persisted lists', () => {
    const small = removeToTrash(fs(), 'notes.txt', 6, T0)!.entry
    expect(entrySize(small)).toBe('5 B')
    expect(isTrashEntries([small])).toBe(true)
    expect(isTrashEntries([{ id: 'x' }])).toBe(false)
    expect(isTrashEntries('junk')).toBe(false)
  })
})
