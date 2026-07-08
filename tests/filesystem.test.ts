import { describe, it, expect } from 'vitest'
import { parseRedirect } from '~/utils/terminal/filesystem'

describe('parseRedirect', () => {
  it('returns the joined text and no file when there is no redirect', () => {
    expect(parseRedirect(['hello', 'world'])).toEqual({ text: 'hello world', file: null })
  })

  it('splits a spaced redirect', () => {
    expect(parseRedirect(['hi', 'there', '>', 'notes.txt'])).toEqual({ text: 'hi there', file: 'notes.txt' })
  })

  it('splits an attached redirect', () => {
    expect(parseRedirect(['hi', '>notes.txt'])).toEqual({ text: 'hi', file: 'notes.txt' })
  })

  it('handles a redirect with no preceding text', () => {
    expect(parseRedirect(['>', 'empty'])).toEqual({ text: '', file: 'empty' })
  })

  it('treats a dangling > as no file', () => {
    expect(parseRedirect(['hi', '>'])).toEqual({ text: 'hi', file: null })
  })
})
