import { describe, it, expect, vi } from 'vitest'
import { collectStorageSlices, formatBytes, dfLines, duLines, STORAGE_QUOTA } from '../app/utils/terminal/storageUsage'

describe('formatBytes', () => {
  it('scales through B, K and M', () => {
    expect(formatBytes(512)).toBe('512B')
    expect(formatBytes(2048)).toBe('2.0K')
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5M')
  })
})

describe('dfLines', () => {
  const slices = [
    { key: 'lv-terminal-fs', bytes: 2048 },
    { key: 'lv-identity', bytes: 64 }
  ]

  it('renders a header, one row per key and a total', () => {
    const lines = dfLines(slices)
    expect(lines).toHaveLength(4)
    expect(lines[0]!.text).toContain('FILESYSTEM')
    expect(lines[1]!.text).toContain('lv-terminal-fs')
    expect(lines[1]!.text).toContain('2.0K')
    expect(lines.at(-1)!.text).toContain('TOTAL')
    expect(lines.at(-1)!.text).toContain('2.1K')
  })

  it('non-empty slices always show at least one bar tick', () => {
    const lines = dfLines([{ key: 'tiny', bytes: 2 }])
    expect(lines[1]!.text).toContain('[|')
  })

  it('caps the bar at full when a key exceeds the quota share', () => {
    const lines = dfLines([{ key: 'huge', bytes: STORAGE_QUOTA * 2 }])
    expect(lines[1]!.text).toContain('[||||||||||]')
  })

  it('says something friendly when storage is empty', () => {
    expect(dfLines([])[0]!.text).toContain('travels light')
  })
})

describe('duLines', () => {
  it('prints size-first rows', () => {
    const lines = duLines([{ key: 'a', bytes: 1024 }])
    expect(lines[0]!.text).toMatch(/1\.0K\s+a/)
  })
})

describe('collectStorageSlices', () => {
  it('measures utf-16 bytes per key, largest first', () => {
    const store: Record<string, string> = { small: 'x', 'big-key': 'y'.repeat(100) }
    // like the real thing: data keys are enumerable, the API methods are not
    const stub = Object.assign(Object.create(null), store)
    Object.defineProperty(stub, 'getItem', { value: (key: string) => store[key] ?? null, enumerable: false })
    vi.stubGlobal('localStorage', stub)
    const slices = collectStorageSlices()
    expect(slices[0]!.key).toBe('big-key')
    expect(slices[0]!.bytes).toBe(('big-key'.length + 100) * 2)
    expect(slices[1]!.bytes).toBe(('small'.length + 1) * 2)
    vi.unstubAllGlobals()
  })
})
