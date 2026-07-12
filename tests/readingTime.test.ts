import { describe, it, expect } from 'vitest'
import { countWords, readingTimeMinutes } from '../app/utils/readingTime'
import type { MinimarkNode, MinimarkRoot } from '../app/utils/terminalMarkdown'

const root = (value: MinimarkNode[]): MinimarkRoot => ({ value })

describe('countWords', () => {
  it('counts words in bare text nodes', () => {
    expect(countWords(['one two  three', 'four'])).toBe(4)
  })

  it('recurses into element tuples, skipping tag and props', () => {
    expect(countWords([['p', {}, 'hello world', ['em', {}, 'nested words']]])).toBe(4)
  })

  it('ignores whitespace-only nodes', () => {
    expect(countWords(['   ', ['p', {}, '\n\t']])).toBe(0)
  })
})

describe('readingTimeMinutes', () => {
  it('never reports less than a minute', () => {
    expect(readingTimeMinutes(root(['short']))).toBe(1)
    expect(readingTimeMinutes(undefined)).toBe(1)
  })

  it('rounds to the nearest minute at ~200 wpm', () => {
    const words = Array.from({ length: 500 }, () => 'word').join(' ')
    expect(readingTimeMinutes(root([words]))).toBe(3)
  })
})
