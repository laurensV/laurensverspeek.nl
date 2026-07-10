import { describe, it, expect } from 'vitest'
import { buildWallpaperList, restoreIndex, WALLPAPERS } from '~/composables/useWallpaper'

describe('buildWallpaperList', () => {
  it('returns only the built-ins without a custom drawing', () => {
    expect(buildWallpaperList('')).toEqual(WALLPAPERS)
  })

  it('appends the paint export as an extra wallpaper', () => {
    const list = buildWallpaperList('data:image/png;base64,AAA')
    expect(list).toHaveLength(WALLPAPERS.length + 1)
    expect(list.at(-1)!.name).toBe('your masterpiece')
    expect(list.at(-1)!.css).toContain('data:image/png;base64,AAA')
    // built-ins are untouched
    expect(list.slice(0, -1)).toEqual(WALLPAPERS)
  })
})

describe('restoreIndex', () => {
  it('accepts a persisted index that fits the current list', () => {
    expect(restoreIndex('2', 4)).toBe(2)
    expect(restoreIndex('4', 5)).toBe(4)
  })

  it('rejects out-of-range, fractional and garbage values', () => {
    expect(restoreIndex('4', 4)).toBeNull() // custom slot gone since last visit
    expect(restoreIndex('-1', 4)).toBeNull()
    expect(restoreIndex('1.5', 4)).toBeNull()
    expect(restoreIndex('wallpaper', 4)).toBeNull()
    expect(restoreIndex(null, 4)).toBeNull()
  })
})
