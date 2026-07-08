import { describe, it, expect } from 'vitest'
import { renderCalendar } from '~/utils/terminal/calendar'

describe('renderCalendar', () => {
  // July 2026 starts on a Wednesday and has 31 days.
  const july2026 = renderCalendar(new Date(2026, 6, 15))

  it('starts with a centered month + year title', () => {
    expect(july2026[0]!.trim()).toBe('July 2026')
  })

  it('has a Sunday-first weekday header', () => {
    expect(july2026[1]).toBe('Su Mo Tu We Th Fr Sa')
  })

  it('offsets the first day to the correct weekday column', () => {
    // 1 July 2026 is a Wednesday, so day "1" must fall in the "We" column
    const weCol = july2026[1]!.indexOf('We')
    expect(july2026[2]!.slice(weCol, weCol + 2)).toBe(' 1')
    expect(july2026[2]!.trimEnd().endsWith('1  2  3  4')).toBe(true)
  })

  it('lays every row out to the full grid width', () => {
    const width = july2026[1]!.length
    for (const row of july2026.slice(1)) expect(row.length).toBeLessThanOrEqual(width)
  })

  it('includes every day of the month exactly once', () => {
    const numbers = july2026
      .slice(2)
      .join(' ')
      .trim()
      .split(/\s+/)
      .map(Number)
    expect(numbers).toEqual(Array.from({ length: 31 }, (_, i) => i + 1))
  })

  it('handles a month that starts on Sunday without a blank week', () => {
    // 1 February 2026 is a Sunday
    const feb = renderCalendar(new Date(2026, 1, 1))
    expect(feb[2]!.startsWith(' 1')).toBe(true)
  })
})
