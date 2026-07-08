import { describe, it, expect } from 'vitest'
import { searchSections, highlightSnippet } from '../app/utils/terminal/search'

const sections = [
  {
    id: '/blog/snake-in-the-terminal',
    title: 'putting a playable snake game in a fake terminal',
    titles: [],
    content: 'a game loop, a pre tag, and stealing the keyboard from vue'
  },
  {
    id: '/blog/snake-in-the-terminal#the-game-loop',
    title: 'the game loop',
    titles: ['putting a playable snake game in a fake terminal'],
    content: 'the loop ticks every 120ms and moves the <snake> one cell forward'
  },
  {
    id: '/blog/rebuilding-this-site#stack',
    title: 'stack',
    titles: ['rebuilding this site'],
    content: 'nuxt four with bulma one, generated fully static'
  }
]

describe('searchSections', () => {
  it('finds case-insensitive matches in section content', () => {
    const hits = searchSections(sections, 'BULMA')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.slug).toBe('rebuilding-this-site')
    expect(hits[0]!.heading).toBe('rebuilding this site › stack')
    expect(hits[0]!.snippetHtml).toContain('<span class="term-accent">bulma</span>')
  })

  it('strips the heading anchor from the path', () => {
    const hits = searchSections(sections, 'ticks')
    expect(hits[0]!.path).toBe('/blog/snake-in-the-terminal')
  })

  it('matches section titles even without a content hit', () => {
    const hits = searchSections(sections, 'game loop')
    // both the parent page (content) and the section (title+content) match
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((hit) => hit.slug === 'snake-in-the-terminal')).toBe(true)
  })

  it('escapes html in snippets', () => {
    const hits = searchSections(sections, '<snake>')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.snippetHtml).toContain('&lt;snake&gt;')
    expect(hits[0]!.snippetHtml).not.toContain('<snake>')
  })

  it('returns nothing for empty terms and respects the limit', () => {
    expect(searchSections(sections, '   ')).toEqual([])
    expect(searchSections(sections, 'the', 1)).toHaveLength(1)
  })
})

describe('highlightSnippet', () => {
  const text = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa MATCH bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

  it('windows around the match with ellipses on both sides', () => {
    const html = highlightSnippet(text, text.indexOf('MATCH'), 5)
    expect(html.startsWith('…')).toBe(true)
    expect(html.endsWith('…')).toBe(true)
    expect(html).toContain('<span class="term-accent">MATCH</span>')
  })

  it('omits ellipses when the match sits at the edges', () => {
    const html = highlightSnippet('MATCH at the start', 0, 5)
    expect(html.startsWith('<span')).toBe(true)
    expect(html.endsWith('…')).toBe(false)
  })
})
