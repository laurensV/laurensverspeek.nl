// Pure matching for the terminal's full-text `search` command. The sections
// come from Nuxt Content's queryCollectionSearchSections (one entry per
// heading, with the plain-text content underneath it).

import { escapeHtml } from '~/utils/escapeHtml'

export interface SearchableSection {
  /** Path including the heading anchor, e.g. /blog/post#section */
  id: string
  title: string
  titles: string[]
  content: string
}

export interface SearchHit {
  /** Page path without the anchor */
  path: string
  /** Post slug, for `blog <slug>` */
  slug: string
  /** Breadcrumb of headings down to the match */
  heading: string
  /** Escaped snippet with the match wrapped in a term-accent span */
  snippetHtml: string
}


/** A one-line, html-safe excerpt around the match, highlighted. */
export function highlightSnippet(content: string, index: number, matchLen: number, radius = 34): string {
  const flat = (from: number, to: number) => content.slice(from, to).replace(/\s+/g, ' ')
  const start = Math.max(0, index - radius)
  const end = Math.min(content.length, index + matchLen + radius)
  const before = `${start > 0 ? '…' : ''}${flat(start, index).trimStart()}`
  const match = content.slice(index, index + matchLen)
  const after = `${flat(index + matchLen, end).trimEnd()}${end < content.length ? '…' : ''}`
  return `${escapeHtml(before)}<span class="term-accent">${escapeHtml(match)}</span>${escapeHtml(after)}`
}

/** Case-insensitive substring search over sections, first `limit` hits win. */
export function searchSections(sections: SearchableSection[], term: string, limit = 8): SearchHit[] {
  const needle = term.trim().toLowerCase()
  if (!needle) return []
  const hits: SearchHit[] = []
  for (const section of sections) {
    const content = section.content ?? ''
    const index = content.toLowerCase().indexOf(needle)
    const inTitle = section.title.toLowerCase().includes(needle)
    if (index < 0 && !inTitle) continue
    const path = section.id.split('#')[0]!
    hits.push({
      path,
      slug: path.split('/').pop() ?? path,
      heading: [...(section.titles ?? []), section.title].filter(Boolean).join(' › '),
      snippetHtml: index >= 0
        ? highlightSnippet(content, index, needle.length)
        : escapeHtml(content.replace(/\s+/g, ' ').slice(0, 70).trimEnd()) + (content.length > 70 ? '…' : '')
    })
    if (hits.length >= limit) break
  }
  return hits
}
