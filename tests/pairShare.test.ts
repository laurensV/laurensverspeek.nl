import { describe, it, expect } from 'vitest'
import { mirrorable, MIRROR_BATCH_MAX, MIRROR_TEXT_MAX, BACKLOG_LINES } from '../app/utils/terminal/pairShare'
import type { TerminalLine } from '../app/utils/terminal/types'

const line = (id: number, text: string, type: TerminalLine['type'] = 'output', html = false): TerminalLine =>
  ({ id, type, text, html })

describe('mirrorable', () => {
  it('maps only lines newer than sinceId, keeping type and text', () => {
    const lines = [line(1, 'old'), line(2, 'fresh', 'input'), line(3, 'boom', 'error')]
    expect(mirrorable(lines, 1)).toEqual([
      { type: 'input', text: 'fresh' },
      { type: 'error', text: 'boom' }
    ])
  })

  it('returns everything for sinceId -1 (the backlog slice)', () => {
    const lines = [line(0, 'a'), line(1, 'b')]
    expect(mirrorable(lines.slice(-BACKLOG_LINES), -1)).toHaveLength(2)
  })

  it('strips tags from html lines — raw HTML never crosses the relay', () => {
    const lines = [line(1, '<a href="/pgp.txt" target="_blank">the key</a>', 'output', true)]
    expect(mirrorable(lines, 0)).toEqual([{ type: 'output', text: 'the key' }])
  })

  it('leaves angle-bracket-free plain text alone even when html-flagged', () => {
    const lines = [line(1, 'plain enough', 'muted', true)]
    expect(mirrorable(lines, 0)[0]?.text).toBe('plain enough')
  })

  it('clips text to the server cap', () => {
    const lines = [line(1, 'x'.repeat(MIRROR_TEXT_MAX + 100))]
    expect(mirrorable(lines, 0)[0]?.text).toHaveLength(MIRROR_TEXT_MAX)
  })

  it('keeps only the newest MIRROR_BATCH_MAX lines of a big burst', () => {
    const lines = Array.from({ length: MIRROR_BATCH_MAX + 21 }, (_, i) => line(i, `l${String(i)}`))
    const batch = mirrorable(lines, -1)
    expect(batch).toHaveLength(MIRROR_BATCH_MAX)
    expect(batch[0]?.text).toBe('l21') // the oldest 21 fell off the front
    expect(batch.at(-1)?.text).toBe(`l${String(MIRROR_BATCH_MAX + 20)}`)
  })

  it('survives a front-spliced transcript — the id cursor never re-sends', () => {
    // the scrollback cap removed ids 0–9; everything ≤ 12 was already mirrored
    const lines = [line(10, 'kept'), line(11, 'kept'), line(12, 'kept'), line(13, 'new')]
    expect(mirrorable(lines, 12)).toEqual([{ type: 'output', text: 'new' }])
  })

  it('returns nothing when the transcript was cleared (no fresh ids)', () => {
    expect(mirrorable([], 42)).toEqual([])
    expect(mirrorable([line(7, 'seen')], 42)).toEqual([])
  })
})
