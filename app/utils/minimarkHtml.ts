// Renders a Nuxt Content (minimark) AST to plain, reader-friendly HTML for the
// RSS feed's content:encoded. Shiki's inline span soup is flattened back to
// simple <pre><code> blocks, relative links become absolute, and non-content
// nodes (style/script) are dropped.

import type { MinimarkNode, MinimarkElement } from '~/utils/terminalMarkdown'
import { escapeHtml } from '~/utils/escapeHtml'


const isElement = (node: MinimarkNode): node is MinimarkElement => Array.isArray(node)

const children = (node: MinimarkElement): MinimarkNode[] => node.slice(2) as MinimarkNode[]

const plainText = (nodes: MinimarkNode[]): string =>
  nodes.map((n) => (isElement(n) ? plainText(children(n)) : n)).join('')

// tags worth keeping in a feed; anything else is unwrapped to its children
const KEEP = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
  'em', 'strong', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
])

function renderNode(node: MinimarkNode, base: string): string {
  if (!isElement(node)) return escapeHtml(node)
  const [tag, props] = node
  if (tag === 'style' || tag === 'script') return ''
  if (tag === 'hr') return '<hr>'
  if (tag === 'br') return '<br>'
  if (tag === 'pre') {
    const language = typeof props.language === 'string' ? props.language : ''
    const code = plainText(children(node)).replace(/\n$/, '')
    return `<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ''}>${escapeHtml(code)}</code></pre>`
  }
  const inner = children(node).map((child) => renderNode(child, base)).join('')
  if (tag === 'a') {
    const href = typeof props.href === 'string' ? props.href : '#'
    const absolute = href.startsWith('/') ? `${base}${href}` : href
    return `<a href="${escapeHtml(absolute)}">${inner}</a>`
  }
  if (tag === 'img') {
    const src = typeof props.src === 'string' ? props.src : ''
    const alt = typeof props.alt === 'string' ? props.alt : ''
    return `<img src="${escapeHtml(src.startsWith('/') ? `${base}${src}` : src)}" alt="${escapeHtml(alt)}">`
  }
  if (!KEEP.has(tag)) return inner
  return `<${tag}>${inner}</${tag}>`
}

/** Whole post body → feed HTML. `base` absolutizes relative links (no trailing /). */
export function minimarkToHtml(body: unknown, base = ''): string {
  const value = (body as { value?: MinimarkNode[] } | undefined)?.value
  if (!Array.isArray(value)) return ''
  return value.map((node) => renderNode(node, base)).filter(Boolean).join('\n')
}
