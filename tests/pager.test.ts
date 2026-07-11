import { describe, it, expect, vi } from 'vitest'
import { createPager } from '~/utils/terminal/pager'

const lines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`)

const drive = () => {
  const frames: string[] = []
  const onEnd = vi.fn()
  const pager = createPager(lines, { onFrame: (f) => frames.push(f), onEnd })
  return { pager, frames, onEnd, last: () => frames.at(-1)! }
}

describe('createPager', () => {
  it('shows the first page with a status line', () => {
    const { last } = drive()
    expect(last()).toContain('line 1')
    expect(last()).toContain('less — 50 lines')
    expect(last()).not.toContain('line 40')
  })

  it('scrolls a line with j/k and pages with space/b', () => {
    const { pager, last } = drive()
    pager.onKey('j')
    expect(last()).toContain('line 2')
    pager.onKey('k')
    expect(last()).toContain('line 1')
    pager.onKey(' ')
    expect(last()).toContain('line 19')
    pager.onKey('b')
    expect(last()).toContain('line 1')
  })

  it('jumps to the end with G and clamps at the bottom', () => {
    const { pager, last } = drive()
    pager.onKey('G')
    expect(last()).toContain('line 50')
    // paging past the end doesn't scroll off
    pager.onKey(' ')
    expect(last()).toContain('line 50')
  })

  it('searches forward with / then Enter', () => {
    const { pager, last } = drive()
    pager.onKey('/')
    for (const ch of '42') pager.onKey(ch)
    pager.onKey('Enter')
    expect(last()).toContain('line 42')
  })

  it('quits on q', () => {
    const { pager, onEnd } = drive()
    expect(pager.onKey('q')).toBe(true)
    expect(onEnd).toHaveBeenCalledWith([])
  })
})
