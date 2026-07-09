import { describe, expect, it } from 'vitest'
import { formatHits } from '~/utils/formatHits'

describe('formatHits', () => {
  it('strips display formatting and pads to six wheels', () => {
    expect(formatHits('1 337')).toEqual(['0', '0', '1', '3', '3', '7'])
    expect(formatHits('12,345,678')).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  })

  it('returns null when the API answer holds no digits', () => {
    expect(formatHits('')).toBeNull()
    expect(formatHits('n/a')).toBeNull()
  })
})
