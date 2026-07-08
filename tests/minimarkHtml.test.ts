import { describe, it, expect } from 'vitest'
import { minimarkToHtml } from '../app/utils/minimarkHtml'

const body = {
  value: [
    ['h2', { id: 'intro' }, 'the ', ['code', {}, '<idea>']],
    ['p', {}, 'read ', ['a', { href: '/blog/other-post' }, 'this'], ' & enjoy'],
    ['pre', { language: 'ts' }, ['code', {}, ['span', { class: 'line' }, 'const a = 1\n'], ['span', { class: 'line' }, 'a < 2']]],
    ['style', {}, '.line { color: red }'],
    ['ul', {}, ['li', {}, 'one'], ['li', {}, 'two']]
  ]
}

describe('minimarkToHtml', () => {
  const html = minimarkToHtml(body, 'https://example.com')

  it('renders headings, lists and inline markup with escaping', () => {
    expect(html).toContain('<h2>the <code>&lt;idea&gt;</code></h2>')
    expect(html).toContain('&amp; enjoy')
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>')
  })

  it('absolutizes relative links against the base', () => {
    expect(html).toContain('<a href="https://example.com/blog/other-post">this</a>')
  })

  it('flattens shiki span soup into a plain code block', () => {
    expect(html).toContain('<pre><code class="language-ts">const a = 1\na &lt; 2</code></pre>')
    expect(html).not.toContain('span')
  })

  it('drops style/script nodes entirely', () => {
    expect(html).not.toContain('color: red')
  })

  it('returns an empty string for unparseable bodies', () => {
    expect(minimarkToHtml(null)).toBe('')
    expect(minimarkToHtml({ value: 'nope' })).toBe('')
  })
})
