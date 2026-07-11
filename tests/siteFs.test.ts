import { describe, it, expect } from 'vitest'
import { applySeeds, siteSeeds, blogSeeds, removalPlan, isSysPath, minimarkToMarkdown } from '~/utils/terminal/siteFs'
import { pathCandidates, stripSysNodes } from '~/utils/terminal/filesystem'
import type { Filesystem } from '~/utils/terminal/filesystem'

describe('siteSeeds', () => {
  it('exposes every page as a directory with files inside', () => {
    const seeds = siteSeeds()
    for (const dir of ['about', 'projects', 'blog', 'uses', 'now', 'cv', 'contact']) {
      expect(seeds[dir], dir).toBeNull() // null = directory
    }
    expect(seeds['about/bio.md']).toContain('# about')
    expect(seeds['readme.md']).toContain('Laurens')
    expect(Object.keys(seeds).some((path) => path.startsWith('projects/') && path.endsWith('.md'))).toBe(true)
  })
})

describe('applySeeds / removalPlan', () => {
  const seeded = () => applySeeds(
    { 'notes.txt': { dir: false, content: 'mine' } },
    { 'blog': null, 'blog/post.md': '# original' }
  )

  it('seeds sys nodes around existing user files', () => {
    const fs = seeded()
    expect(fs['blog']).toEqual({ dir: true, content: '', sys: true })
    expect(fs['blog/post.md']).toEqual({ dir: false, content: '# original', sys: true })
    expect(fs['notes.txt']).toEqual({ dir: false, content: 'mine' })
  })

  it('lets a user override win over a seed', () => {
    const withEdit: Filesystem = {
      ...seeded(),
      'blog/post.md': { dir: false, content: '# my edit' }
    }
    const reseeded = applySeeds(withEdit, { 'blog/post.md': '# original' })
    expect(reseeded['blog/post.md']).toEqual({ dir: false, content: '# my edit' })
  })

  it('protects sys nodes and restores seeds under removed overrides', () => {
    const fs = seeded()
    expect(removalPlan(fs, 'blog/post.md')).toBe('protected')
    expect(removalPlan(fs, 'blog')).toBe('protected')
    expect(removalPlan(fs, 'ghost.txt')).toBe('missing')
    expect(removalPlan(fs, 'notes.txt')).toEqual({ restoreSeed: null })
    const withEdit: Filesystem = { ...fs, 'blog/post.md': { dir: false, content: '# my edit' } }
    expect(removalPlan(withEdit, 'blog/post.md')).toEqual({ restoreSeed: '# original' })
    expect(isSysPath(withEdit, 'blog/post.md')).toBe(false)
    expect(isSysPath(withEdit, 'blog')).toBe(true)
  })
})

describe('stripSysNodes', () => {
  it('drops every seeded node so only user files persist', () => {
    const stripped = stripSysNodes({
      'mine.txt': { dir: false, content: 'keep' },
      'blog': { dir: true, content: '', sys: true },
      'blog/post.md': { dir: false, content: 'seed', sys: true }
    })
    expect(Object.keys(stripped)).toEqual(['mine.txt'])
  })
})

describe('blogSeeds', () => {
  it('prefers the raw markdown source, frontmatter included', () => {
    const seeds = blogSeeds([{
      path: '/blog/hello',
      title: 'Hello',
      date: '2026-01-01',
      rawbody: '---\ntitle: Hello\n---\n\n# Hello',
      body: {}
    }])
    expect(seeds['blog/hello.md']).toBe('---\ntitle: Hello\n---\n\n# Hello')
  })

  it('serializes the AST with generated frontmatter as a fallback', () => {
    const seeds = blogSeeds([{
      path: '/blog/fallback',
      title: 'Fallback',
      date: '2026-01-01',
      tags: ['a', 'b'],
      body: { value: [['h1', {}, 'Fallback'], ['p', {}, 'Some ', ['strong', {}, 'bold'], ' text.']] },
      description: 'desc'
    }])
    const content = seeds['blog/fallback.md'] as string
    expect(content).toContain('title: Fallback')
    expect(content).toContain('tags: [a, b]')
    expect(content).toContain('# Fallback')
    expect(content).toContain('Some **bold** text.')
  })
})

describe('minimarkToMarkdown', () => {
  it('round-trips the common blocks', () => {
    const md = minimarkToMarkdown({
      value: [
        ['h2', {}, 'Section'],
        ['p', {}, 'A ', ['a', { href: '/x' }, 'link'], ' and ', ['code', {}, 'code'], '.'],
        ['pre', { language: 'ts' }, ['code', {}, 'const a = 1\n']],
        ['ul', {}, ['li', {}, 'one'], ['li', {}, 'two']],
        ['blockquote', {}, ['p', {}, 'quoted']],
        ['hr', {}]
      ]
    })
    expect(md).toContain('## Section')
    expect(md).toContain('[link](/x)')
    expect(md).toContain('`code`')
    expect(md).toContain('```ts\nconst a = 1\n```')
    expect(md).toContain('- one\n- two')
    expect(md).toContain('> quoted')
    expect(md).toContain('---')
  })
})

describe('pathCandidates', () => {
  const fs: Filesystem = {
    'blog': { dir: true, content: '', sys: true },
    'blog/alpha.md': { dir: false, content: '', sys: true },
    'blog/beta.md': { dir: false, content: '', sys: true },
    'box.txt': { dir: false, content: '' }
  }

  it('completes top-level names, marking directories', () => {
    expect(pathCandidates(fs, '', 'b')).toEqual(['blog/', 'box.txt'])
    expect(pathCandidates(fs, '', 'b', { dirsOnly: true })).toEqual(['blog/'])
  })

  it('descends into directories one segment at a time', () => {
    expect(pathCandidates(fs, '', 'blog/')).toEqual(['blog/alpha.md', 'blog/beta.md'])
    expect(pathCandidates(fs, '', 'blog/be')).toEqual(['blog/beta.md'])
  })

  it('resolves relative to the cwd and via ..', () => {
    expect(pathCandidates(fs, 'blog', 'al')).toEqual(['alpha.md'])
    expect(pathCandidates(fs, 'blog', '../bo')).toEqual(['../box.txt'])
  })

  it('returns nothing for a bogus directory prefix', () => {
    expect(pathCandidates(fs, '', 'nope/x')).toEqual([])
  })
})
