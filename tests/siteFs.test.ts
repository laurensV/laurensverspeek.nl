import { describe, it, expect } from 'vitest'
import { applySeeds, siteSeeds, blogSeeds, restoreSeeds, hasSeedsUnder, isSysPath, markSeedsDeleted, minimarkToMarkdown } from '~/utils/terminal/siteFs'
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

describe('applySeeds / restoreSeeds', () => {
  const seeded = () => applySeeds(
    { 'notes.txt': { dir: false, content: 'mine' } },
    { 'blog': null, 'blog/post.md': '# original' }
  )

  it('seeds sys nodes around existing user files', () => {
    const fs = seeded()
    expect(fs['blog']).toEqual({ dir: true, content: '', sys: true })
    expect(fs['blog/post.md']).toEqual({ dir: false, content: '# original', sys: true })
    expect(fs['notes.txt']).toEqual({ dir: false, content: 'mine' })
    expect(isSysPath(fs, 'blog')).toBe(true)
    expect(isSysPath(fs, 'notes.txt')).toBe(false)
  })

  it('lets a user override win over a seed', () => {
    const withEdit: Filesystem = {
      ...seeded(),
      'blog/post.md': { dir: false, content: '# my edit' }
    }
    const reseeded = applySeeds(withEdit, { 'blog/post.md': '# original' })
    expect(reseeded['blog/post.md']).toEqual({ dir: false, content: '# my edit' })
  })

  it('skips tombstoned paths, so deleted site files stay deleted', () => {
    const fs = applySeeds(
      {},
      { 'blog': null, 'blog/post.md': '# original' },
      new Set(['blog/post.md'])
    )
    expect(fs['blog']).toBeDefined()
    expect(fs['blog/post.md']).toBeUndefined()
  })

  it('restoreSeeds regrows edits and deletions, scoped by prefix', () => {
    seeded() // populate the registry
    const mangled: Filesystem = {
      'notes.txt': { dir: false, content: 'mine' },
      'blog': { dir: true, content: '', sys: true },
      'blog/post.md': { dir: false, content: '# my edit' } // override
    }
    const scoped = restoreSeeds(mangled, 'blog/post.md')
    expect(scoped.restored).toBe(1)
    expect(scoped.files['blog/post.md']).toEqual({ dir: false, content: '# original', sys: true })
    expect(scoped.files['notes.txt']).toEqual({ dir: false, content: 'mine' })
    // full restore counts only nodes that actually changed
    const full = restoreSeeds(scoped.files)
    expect(full.restored).toBe(0)
  })

  it('knows which paths are site content', () => {
    seeded()
    expect(hasSeedsUnder('blog')).toBe(true)
    expect(hasSeedsUnder('blog/post.md')).toBe(true)
    expect(hasSeedsUnder('notes.txt')).toBe(false)
    expect(hasSeedsUnder('')).toBe(true)
  })

  it('tombstones paths under a seeded dir even before their own seed lands', () => {
    // only the blog DIR is registered — the post seed hasn't arrived yet
    // (mirrors the async fetchPosts window)
    applySeeds({}, { 'blog': null })
    markSeedsDeleted(['blog/late-post.md'])
    // now the async blog seed lands: the tombstone must hold it back
    const fs = applySeeds({}, { 'blog/late-post.md': '# original' }, new Set(['blog/late-post.md']))
    expect(fs['blog/late-post.md']).toBeUndefined()
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
