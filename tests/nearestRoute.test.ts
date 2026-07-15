import { describe, it, expect } from 'vitest'
import { levenshtein, nearestRoute } from '~/utils/nearestRoute'

const ROUTES = ['/projects', '/blog', '/about', '/cv', '/contact']

describe('levenshtein', () => {
  it('is zero for identical strings', () => {
    expect(levenshtein('blog', 'blog')).toBe(0)
  })

  it('counts single edits', () => {
    expect(levenshtein('blog', 'blogs')).toBe(1)
    expect(levenshtein('projcts', 'projects')).toBe(1)
  })

  it('handles empty strings', () => {
    expect(levenshtein('', 'blog')).toBe(4)
    expect(levenshtein('blog', '')).toBe(4)
  })
})

describe('nearestRoute', () => {
  it('suggests the closest page for a near-miss path', () => {
    expect(nearestRoute('/projcts', ROUTES)?.route).toBe('/projects')
    expect(nearestRoute('/abot', ROUTES)?.route).toBe('/about')
  })

  it('returns null when nothing is close enough', () => {
    expect(nearestRoute('/completely-different-nonsense', ROUTES)).toBeNull()
  })

  it('only considers the first path segment', () => {
    expect(nearestRoute('/blog/some-old-slug', ROUTES)?.route).toBe('/blog')
  })

  it('returns null for the root path', () => {
    expect(nearestRoute('/', ROUTES)).toBeNull()
  })
})
