import { describe, it, expect } from 'vitest'
import { cowsay, figlet, fortune } from '~/utils/terminalToys'

describe('cowsay', () => {
  it('puts short text in a single-line bubble and draws the cow', () => {
    const out = cowsay('moo')
    expect(out).toContain('< moo >')
    expect(out).toContain('^__^')
    expect(out).toContain('(oo)')
  })

  it('falls back to a default when given no text', () => {
    expect(cowsay('')).toContain('moo?')
  })

  it('wraps long text into a multi-line bubble', () => {
    const out = cowsay('the quick brown fox jumps over the lazy dog again and again please')
    const lines = out.split('\n')
    // multi-line bubbles use the / \ | frame instead of < >
    expect(lines.some((l) => l.startsWith('/ '))).toBe(true)
    expect(lines.some((l) => l.startsWith('\\ '))).toBe(true)
    expect(out).not.toContain('< ')
  })
})

describe('figlet', () => {
  it('renders five rows of block glyphs', () => {
    const rows = figlet('hi').split('\n')
    expect(rows).toHaveLength(5)
    expect(rows.join('')).toContain('█')
  })

  it('keeps every row the same width', () => {
    const rows = figlet('lv').split('\n')
    const widths = new Set(rows.map((r) => r.length))
    expect(widths.size).toBe(1)
  })

  it('falls back to a default when empty', () => {
    expect(figlet('').split('\n')).toHaveLength(5)
  })
})

describe('fortune', () => {
  it('always returns a non-empty string', () => {
    for (let i = 0; i < 20; i++) expect(fortune().length).toBeGreaterThan(0)
  })
})
