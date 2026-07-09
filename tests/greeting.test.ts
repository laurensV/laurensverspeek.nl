import { describe, it, expect } from 'vitest'
import { greetingLine } from '../app/utils/terminal/greeting'

describe('greetingLine', () => {
  it('covers every hour with a period-appropriate line', () => {
    expect(greetingLine(8)).toContain('morning')
    expect(greetingLine(14)).toContain('afternoon')
    expect(greetingLine(20)).toContain('evening')
    expect(greetingLine(2)).toContain('midnight')
    expect(greetingLine(23)).toContain('midnight')
  })

  it('flips exactly at the boundaries', () => {
    expect(greetingLine(4)).toContain('midnight')
    expect(greetingLine(5)).toContain('morning')
    expect(greetingLine(11)).toContain('morning')
    expect(greetingLine(12)).toContain('afternoon')
    expect(greetingLine(17)).toContain('afternoon')
    expect(greetingLine(18)).toContain('evening')
    expect(greetingLine(22)).toContain('evening')
  })
})
