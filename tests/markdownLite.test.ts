import { describe, it, expect } from 'vitest'
import { parseFrontmatter, parseTagList, renderMarkdownLite } from '~/utils/markdownLite'

describe('parseFrontmatter', () => {
  it('splits meta from body', () => {
    const { meta, body } = parseFrontmatter('---\ntitle: Hi\ndate: 2026-01-01\n---\n\n# Hi')
    expect(meta.title).toBe('Hi')
    expect(meta.date).toBe('2026-01-01')
    expect(body.trim()).toBe('# Hi')
  })

  it('passes documents without frontmatter through untouched', () => {
    const { meta, body } = parseFrontmatter('# Just markdown')
    expect(meta).toEqual({})
    expect(body).toBe('# Just markdown')
  })

  it('parses tag lists in both spellings', () => {
    expect(parseTagList('[a, b]')).toEqual(['a', 'b'])
    expect(parseTagList('a, b')).toEqual(['a', 'b'])
    expect(parseTagList(undefined)).toEqual([])
  })
})

describe('renderMarkdownLite', () => {
  it('renders the common blocks', () => {
    const html = renderMarkdownLite([
      '# Title',
      '',
      'A paragraph with **bold**, *italic*, `code` and a [link](/blog).',
      '',
      '- one',
      '- two',
      '',
      '1. first',
      '',
      '> a quote',
      '',
      '---',
      '',
      '```ts',
      'const a = 1',
      '```'
    ].join('\n'))
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain('<a href="/blog" target="_blank" rel="noopener">link</a>')
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>')
    expect(html).toContain('<ol><li>first</li></ol>')
    expect(html).toContain('<blockquote><p>a quote</p></blockquote>')
    expect(html).toContain('<hr>')
    expect(html).toContain('<pre><code class="language-ts">const a = 1</code></pre>')
  })

  it('escapes every piece of source text (no raw HTML survives)', () => {
    const html = renderMarkdownLite('# <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })

  it('neuters javascript: links', () => {
    const html = renderMarkdownLite('[x](javascript:alert(1))')
    expect(html).toContain('href="#"')
  })

  it('escapes text inside code fences', () => {
    const html = renderMarkdownLite('```\n<b>not bold</b>\n```')
    expect(html).toContain('&lt;b&gt;not bold&lt;/b&gt;')
  })
})
