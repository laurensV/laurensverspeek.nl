import { describe, it, expect } from 'vitest'
import { toggleIndex, rangeSet } from '~/utils/multiSelect'

describe('toggleIndex', () => {
  it('adds an index that is not selected', () => {
    expect([...toggleIndex(new Set([1]), 3)].sort()).toEqual([1, 3])
  })

  it('removes an index that is already selected', () => {
    expect([...toggleIndex(new Set([1, 3]), 3)]).toEqual([1])
  })

  it('can empty the selection entirely', () => {
    expect(toggleIndex(new Set([2]), 2).size).toBe(0)
  })

  it('does not mutate the input set', () => {
    const input = new Set([1])
    toggleIndex(input, 2)
    expect([...input]).toEqual([1])
  })
})

describe('rangeSet', () => {
  it('selects the inclusive range downward from the anchor', () => {
    expect([...rangeSet(1, 4)]).toEqual([1, 2, 3, 4])
  })

  it('selects the inclusive range upward from the anchor', () => {
    expect([...rangeSet(4, 1)]).toEqual([1, 2, 3, 4])
  })

  it('collapses to a single row when anchor and focus coincide', () => {
    expect([...rangeSet(2, 2)]).toEqual([2])
  })
})
