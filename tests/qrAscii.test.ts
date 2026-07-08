import { describe, it, expect } from 'vitest'
import { qrMatrix, halfBlockLines, qrAsciiLines } from '../app/utils/qrAscii'

describe('qrMatrix', () => {
  it('produces a square matrix with a quiet zone', () => {
    const matrix = qrMatrix('https://laurensverspeek.nl/contact.vcf')
    expect(matrix.length).toBeGreaterThanOrEqual(21 + 4) // min version + 2×2 border
    for (const row of matrix) expect(row.length).toBe(matrix.length)
    // the quiet zone is all light
    expect(matrix[0]!.every((cell) => !cell)).toBe(true)
    expect(matrix.every((row) => !row[0] && !row.at(-1))).toBe(true)
  })

  it('contains the finder pattern corner (dark run) inside the quiet zone', () => {
    const matrix = qrMatrix('hello', 2)
    // finder patterns start right after the quiet zone with 7 dark modules
    expect(matrix[2]!.slice(2, 9).every(Boolean)).toBe(true)
  })
})

describe('halfBlockLines', () => {
  it('packs two rows per line with the right glyphs', () => {
    const lines = halfBlockLines([
      [true, true, false, false],
      [true, false, true, false]
    ])
    expect(lines).toEqual(['█▀▄ '])
  })

  it('handles an odd number of rows', () => {
    const lines = halfBlockLines([[true, false]])
    expect(lines).toEqual(['▀ '])
  })
})

describe('qrAsciiLines', () => {
  it('renders equal-width lines, half the matrix height', () => {
    const lines = qrAsciiLines('https://laurensverspeek.nl/contact.vcf')
    const width = lines[0]!.length
    expect(lines.every((line) => line.length === width)).toBe(true)
    expect(lines.length).toBe(Math.ceil(width / 2))
  })
})
