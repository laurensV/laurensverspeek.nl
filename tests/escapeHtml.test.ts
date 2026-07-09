import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../app/utils/escapeHtml'

describe('escapeHtml', () => {
  it('escapes the four html-significant characters', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
  })

  it('leaves normal text alone', () => {
    expect(escapeHtml("plain text, quotes' fine")).toBe("plain text, quotes' fine")
  })
})
