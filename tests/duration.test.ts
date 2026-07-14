import { describe, it, expect } from 'vitest'
import { parseDuration, formatDuration } from '../app/utils/terminal/duration'

describe('parseDuration', () => {
  it('reads a bare integer as seconds', () => {
    expect(parseDuration('45')).toBe(45_000)
  })

  it('reads single units', () => {
    expect(parseDuration('90s')).toBe(90_000)
    expect(parseDuration('5m')).toBe(300_000)
    expect(parseDuration('2h')).toBe(7_200_000)
  })

  it('sums combined units and ignores spacing/case', () => {
    expect(parseDuration('1h30m')).toBe(5_400_000)
    expect(parseDuration('1H 30M 15S')).toBe(5_415_000)
  })

  it('rejects empty and junk', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('5x')).toBeNull()
    expect(parseDuration('5m banana')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('renders a compact label', () => {
    expect(formatDuration(90_000)).toBe('1m30s')
    expect(formatDuration(300_000)).toBe('5m')
    expect(formatDuration(5_400_000)).toBe('1h30m')
    expect(formatDuration(0)).toBe('0s')
  })
})
