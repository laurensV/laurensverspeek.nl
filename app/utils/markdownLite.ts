// A deliberately tiny markdown renderer for blog posts the visitor edited in
// the terminal (vim blog/<slug>.md). Every piece of source text is HTML-
// escaped BEFORE any tags are added, and link hrefs are restricted to
// http(s)/relative — so the output is authored markup over inert text, never
// raw user HTML.

import { escapeHtml } from '~/utils/escapeHtml'

export interface ParsedFrontmatter {
  meta: Record<string, string>
  body: string
}

/** Split optional `---` frontmatter off a markdown document. */
export function parseFrontmatter(source: string): ParsedFrontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!match) return { meta: {}, body: source }
  const meta: Record<string, string> = {}
  for (const line of match[1]!.split('\n')) {
    const pair = /^(\w[\w-]*):\s*(.*)$/.exec(line.trim())
    if (pair) meta[pair[1]!] = pair[2]!.replace(/^['"]|['"]$/g, '')
  }
  return { meta, body: source.slice(match[0].length) }
}

/** Frontmatter `tags: [a, b]` / `tags: a, b` → string array. */
export function parseTagList(value: string | undefined): string[] {
  if (!value) return []
  return value.replace(/^\[|\]$/g, '').split(',').map((tag) => tag.trim()).filter(Boolean)
}

const safeHref = (href: string): string => {
  const trimmed = href.trim()
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  return '#'
}

/** Inline markdown over ALREADY-ESCAPED text: code, bold, italic, links. */
const renderInline = (escaped: string): string =>
  escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) =>
      `<a href="${escapeHtml(safeHref(href))}" target="_blank" rel="noopener">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')

/** Markdown body → HTML. Small on purpose: the blocks a blog post uses. */
export function renderMarkdownLite(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean, items: string[] } | null = null
  let code: { language: string, lines: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${renderInline(escapeHtml(paragraph.join(' ')))}</p>`)
      paragraph = []
    }
  }
  const flushList = () => {
    if (list) {
      const tag = list.ordered ? 'ol' : 'ul'
      out.push(`<${tag}>${list.items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`)
      list = null
    }
  }

  for (const line of lines) {
    if (code) {
      if (line.trim().startsWith('```')) {
        out.push(`<pre><code${code.language ? ` class="language-${escapeHtml(code.language)}"` : ''}>${escapeHtml(code.lines.join('\n'))}</code></pre>`)
        code = null
      } else {
        code.lines.push(line)
      }
      continue
    }
    const fence = /^```(\w*)\s*$/.exec(line.trim())
    if (fence) {
      flushParagraph()
      flushList()
      code = { language: fence[1] ?? '', lines: [] }
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1]!.length
      out.push(`<h${level}>${renderInline(escapeHtml(heading[2]!))}</h${level}>`)
      continue
    }
    const item = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(line)
    if (item) {
      flushParagraph()
      const ordered = item[1] !== '-' && item[1] !== '*'
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push(renderInline(escapeHtml(item[2]!)))
      continue
    }
    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flushParagraph()
      flushList()
      out.push(`<blockquote><p>${renderInline(escapeHtml(quote[1]!))}</p></blockquote>`)
      continue
    }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph()
      flushList()
      out.push('<hr>')
      continue
    }
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    paragraph.push(line.trim())
  }
  if (code) out.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`)
  flushParagraph()
  flushList()
  return out.join('\n')
}
