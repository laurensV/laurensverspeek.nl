import { describe, it, expect } from 'vitest'
import { buildContribGraph, shadeLevel, type DayCount } from '~/utils/terminal/contribGraph'

describe('shadeLevel', () => {
  it('buckets a count against the busiest day', () => {
    expect(shadeLevel(0, 10)).toBe(0)
    expect(shadeLevel(1, 10)).toBe(1)
    expect(shadeLevel(5, 10)).toBe(3)
    expect(shadeLevel(10, 10)).toBe(4)
    expect(shadeLevel(3, 0)).toBe(0) // no activity anywhere
  })
})

describe('buildContribGraph', () => {
  const today = new Date('2026-07-11T00:00:00Z') // a Saturday

  it('renders a 7-row grid with a legend and total', () => {
    const days: DayCount[] = [
      { date: '2026-07-06', count: 4 },
      { date: '2026-07-08', count: 12 },
      { date: '2026-07-10', count: 1 }
    ]
    const lines = buildContribGraph(days, today, 4)
    // header + 7 weekday rows + blank + legend
    expect(lines).toHaveLength(10)
    expect(lines.at(-1)).toContain('17 contributions in the last 4 weeks')
    // the busiest day (12) renders as the darkest shade somewhere in the grid
    expect(lines.join('\n')).toContain('█')
    // Mon/Wed/Fri are labelled, Sun/Tue/Thu/Sat are not
    expect(lines[2]).toMatch(/^Mon /)
    expect(lines[1]).toMatch(/^ {4}/)
  })

  it('handles an empty history without crashing', () => {
    const lines = buildContribGraph([], today, 4)
    expect(lines.at(-1)).toContain('0 contributions')
    // the grid rows (excluding the legend, which shows the full scale) are all empty
    const grid = lines.slice(1, 8).join('\n')
    expect(grid).not.toContain('█')
    expect(grid).toContain('·')
  })
})
