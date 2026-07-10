import { describe, it, expect } from 'vitest'
import { paneOrder, canSplit, nextFocus, focusAfterClose, paneLayout, prefixAction, MAX_PANES } from '../app/utils/terminal/panes'

describe('terminal panes', () => {
  it('orders panes with the classic transcript first', () => {
    expect(paneOrder([3, 1])).toEqual([0, 3, 1])
    expect(paneOrder([])).toEqual([0])
  })

  it('caps splits at MAX_PANES', () => {
    expect(canSplit(1)).toBe(true)
    expect(canSplit(MAX_PANES - 1)).toBe(true)
    expect(canSplit(MAX_PANES)).toBe(false)
  })

  it('cycles focus in both directions, wrapping', () => {
    const order = [0, 1, 2]
    expect(nextFocus(order, 0, 1)).toBe(1)
    expect(nextFocus(order, 2, 1)).toBe(0)
    expect(nextFocus(order, 0, -1)).toBe(2)
    // unknown pane falls back to the first
    expect(nextFocus(order, 99, 1)).toBe(0)
  })

  it('focuses the previous neighbour after a close', () => {
    expect(focusAfterClose([0, 1, 2], 2)).toBe(1)
    expect(focusAfterClose([0, 1, 2], 1)).toBe(0)
    expect(focusAfterClose([0], 0)).toBe(0)
  })

  it('picks the layout from count and split direction', () => {
    expect(paneLayout(1, 'cols')).toBe('is-single')
    expect(paneLayout(2, 'cols')).toBe('is-cols')
    expect(paneLayout(2, 'rows')).toBe('is-rows')
    expect(paneLayout(3, 'cols')).toBe('is-grid')
    expect(paneLayout(4, 'rows')).toBe('is-grid')
  })

  it('maps the tmux prefix keys', () => {
    expect(prefixAction('%')).toEqual({ kind: 'split', dir: 'cols' })
    expect(prefixAction('"')).toEqual({ kind: 'split', dir: 'rows' })
    expect(prefixAction('ArrowRight')).toEqual({ kind: 'focus', step: 1 })
    expect(prefixAction('ArrowLeft')).toEqual({ kind: 'focus', step: -1 })
    expect(prefixAction('o')).toEqual({ kind: 'focus', step: 1 })
    expect(prefixAction('x')).toEqual({ kind: 'close' })
    expect(prefixAction('q')).toBeNull()
  })
})
