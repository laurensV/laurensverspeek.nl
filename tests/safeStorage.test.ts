import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storageGet, storageSet, storageRemove, storageGetJson, storageSetJson, isStringArray } from '../app/utils/safeStorage'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key)
})

beforeEach(() => store.clear())

describe('safeStorage', () => {
  it('round-trips strings and json', () => {
    expect(storageSet('k', 'v')).toBe(true)
    expect(storageGet('k')).toBe('v')
    expect(storageSetJson('j', { a: [1, 2] })).toBe(true)
    expect(storageGetJson('j', (v): v is { a: number[] } => !!v && typeof v === 'object')).toEqual({ a: [1, 2] })
    storageRemove('k')
    expect(storageGet('k')).toBeNull()
  })

  it('rejects values that fail validation', () => {
    storageSet('j', '{"nope": true}')
    expect(storageGetJson('j', isStringArray)).toBeNull()
  })

  it('treats corrupted json as absent', () => {
    storageSet('j', '{not json')
    expect(storageGetJson('j', isStringArray)).toBeNull()
  })

  it('survives a throwing storage (private mode, quota)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('blocked')
      }
    }
    vi.stubGlobal('localStorage', throwing)
    expect(storageGet('k')).toBeNull()
    expect(storageSet('k', 'v')).toBe(false)
    expect(storageSetJson('k', [])).toBe(false)
    expect(storageGetJson('k', isStringArray)).toBeNull()
    expect(() => storageRemove('k')).not.toThrow()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key)
    })
  })

  it('isStringArray accepts only homogeneous string arrays', () => {
    expect(isStringArray(['a', 'b'])).toBe(true)
    expect(isStringArray(['a', 1])).toBe(false)
    expect(isStringArray('a')).toBe(false)
  })
})
