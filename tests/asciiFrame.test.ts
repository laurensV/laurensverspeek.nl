import { describe, it, expect } from 'vitest'
import { rule, boxed, ruledRow, borderGrid } from '../app/utils/asciiFrame'

describe('rule', () => {
  it('repeats the glyph to the given width', () => {
    expect(rule(3)).toBe('───')
    expect(rule(2, '=')).toBe('==')
  })
})

describe('boxed', () => {
  it('wraps rows with matching top/bottom rules', () => {
    expect(boxed(['ab', 'cd'], 2)).toEqual(['┌──┐', '│ab│', '│cd│', '└──┘'])
  })
})

describe('ruledRow', () => {
  it('joins ruled cells with the given corners', () => {
    expect(ruledRow('┌', '┬', '┐', 2, 3)).toBe('┌───┬───┐')
  })
})

describe('borderGrid', () => {
  it('draws a border with interior cells from the callback', () => {
    const out = borderGrid(4, 3, () => '·').split('\n')
    expect(out[0]).toBe('┌──┐')
    expect(out[1]).toBe('│··│')
    expect(out[2]).toBe('└──┘')
  })
})
