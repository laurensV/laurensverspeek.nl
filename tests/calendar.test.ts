import { describe, it, expect } from 'vitest'
import { renderCalendar, monthGrid } from '~/utils/terminal/calendar'

describe('renderCalendar', () => {
  // July 2026 starts on a Wednesday and has 31 days.
  const july2026 = renderCalendar(new Date(2026, 6, 15))

  it('starts with a centered month + year title', () => {
    expect(july2026[0]!.trim()).toBe('July 2026')
  })

  it('has a Monday-first weekday header (shared with the lvOS popover)', () => {
    expect(july2026[1]).toBe('Mo Tu We Th Fr Sa Su')
  })

  it('offsets the first day to the correct weekday column', () => {
    // 1 July 2026 is a Wednesday, so day "1" must fall in the "We" column
    const weCol = july2026[1]!.indexOf('We')
    expect(july2026[2]!.slice(weCol, weCol + 2)).toBe(' 1')
    expect(july2026[2]!.trimEnd().endsWith('1  2  3  4  5')).toBe(true)
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

  it('handles a month that starts on Monday without a blank week', () => {
    // 1 June 2026 is a Monday
    const june = renderCalendar(new Date(2026, 5, 1))
    expect(june[2]!.startsWith(' 1')).toBe(true)
  })
})

describe('monthGrid', () => {
  it('places Monday-first leading blanks', () => {
    // 1 July 2026 is a Wednesday → Mo,Tu blank, then Wed = 2 leading blanks
    expect(monthGrid(new Date(2026, 6, 1))).toMatchObject({
      title: 'July 2026',
      leadingBlanks: 2,
      daysInMonth: 31
    })
    // 1 February 2026 is a Sunday → the whole Mon..Sat row blanks = 6
    expect(monthGrid(new Date(2026, 1, 1)).leadingBlanks).toBe(6)
  })
})
