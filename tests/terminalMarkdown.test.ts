import { describe, it, expect } from 'vitest'
import { renderMarkdownToTerminal } from '~/utils/terminalMarkdown'

// minimark bodies as Nuxt Content v3 produces them: [tag, props, ...children]
const body = (...nodes: unknown[]) => ({ type: 'minimark', value: nodes })

describe('renderMarkdownToTerminal', () => {
  it('renders headings as primary lines with # prefixes', () => {
    const lines = renderMarkdownToTerminal(body(['h2', {}, 'the game is a string factory']))
    expect(lines).toEqual([{ type: 'primary', text: '## the game is a string factory' }])
  })

  it('renders paragraphs with inline code and links as trusted html', () => {
    const lines = renderMarkdownToTerminal(
      body(['p', {}, 'run ', ['code', {}, 'snake'], ' or read ', ['a', { href: '/blog' }, 'the blog']])
    )
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ type: 'output', html: true })
    expect(lines[0]!.text).toContain('<span class="term-accent">snake</span>')
    expect(lines[0]!.text).toContain('<a href="/blog" target="_blank" rel="noopener">the blog</a>')
  })

  it('escapes html in text content', () => {
    const lines = renderMarkdownToTerminal(body(['p', {}, 'a <pre> tag & "quotes"']))
    expect(lines[0]!.text).toBe('a &lt;pre&gt; tag &amp; &quot;quotes&quot;')
  })

  it('renders code blocks with fences and language', () => {
    const lines = renderMarkdownToTerminal(
      body(['pre', { language: 'ts' }, ['code', {}, 'const x = 1\nconst y = 2\n']])
    )
    expect(lines.map((l) => l.text)).toEqual(['```ts', '  const x = 1', '  const y = 2', '```'])
  })

  it('renders unordered and ordered lists', () => {
    const lines = renderMarkdownToTerminal(
      body(
        ['ul', {}, ['li', {}, 'first'], ['li', {}, 'second']],
        ['ol', {}, ['li', {}, 'one'], ['li', {}, 'two']]
      )
    )
    expect(lines.map((l) => l.text)).toEqual(['  - first', '  - second', '', '  1. one', '  2. two'])
  })

  it('skips injected style and script nodes', () => {
    const lines = renderMarkdownToTerminal(
      body(['p', {}, 'text'], ['style', {}, '.shiki{color:red}'])
    )
    expect(lines.map((l) => l.text)).toEqual(['text'])
    expect(lines.every((l) => !l.text.includes('shiki'))).toBe(true)
  })

  it('renders blockquotes and horizontal rules', () => {
    const lines = renderMarkdownToTerminal(
      body(['blockquote', {}, ['p', {}, 'a wise quote']], ['hr', {}])
    )
    const texts = lines.map((l) => l.text)
    expect(texts).toContain('> a wise quote')
    expect(texts).toContain('---')
  })

  it('renders bold and italic inline markup', () => {
    const lines = renderMarkdownToTerminal(
      body(['p', {}, 'this is ', ['strong', {}, 'bold'], ' and ', ['em', {}, 'italic']])
    )
    expect(lines[0]!.text).toBe('this is <b>bold</b> and <i>italic</i>')
  })

  it('numbers ordered list items sequentially', () => {
    const lines = renderMarkdownToTerminal(
      body(['ol', {}, ['li', {}, 'first'], ['li', {}, 'second'], ['li', {}, 'third']])
    )
    expect(lines.map((l) => l.text)).toEqual(['  1. first', '  2. second', '  3. third'])
  })

  it('handles a missing or malformed body gracefully', () => {
    expect(renderMarkdownToTerminal(undefined)).toEqual([
      { type: 'muted', text: '(post body could not be parsed)' }
    ])
    expect(renderMarkdownToTerminal({ value: 'nope' })).toEqual([
      { type: 'muted', text: '(post body could not be parsed)' }
    ])
  })
})
