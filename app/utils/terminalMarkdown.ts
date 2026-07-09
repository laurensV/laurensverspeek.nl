// Renders a Nuxt Content (minimark) AST as terminal lines, so blog posts can
// be read inside the fake terminal without leaving it. Output is trusted HTML
// built exclusively from our own markdown files (all text is escaped).

import { escapeHtml } from '~/utils/escapeHtml'

export interface TermMdLine {
  type: 'output' | 'muted' | 'primary'
  text: string
  html?: boolean
}

export type MinimarkElement = [string, Record<string, unknown>, ...MinimarkNode[]]
export type MinimarkNode = string | MinimarkElement
/** The root of a rendered Nuxt Content body: `{ value: [...nodes] }`. */
export interface MinimarkRoot { value?: MinimarkNode[] }


const isElement = (node: MinimarkNode): node is MinimarkElement => Array.isArray(node)

const children = (node: MinimarkElement): MinimarkNode[] => node.slice(2) as MinimarkNode[]

const plainText = (nodes: MinimarkNode[]): string =>
  nodes.map((n) => (isElement(n) ? plainText(children(n)) : n)).join('')

/** Inline markdown → terminal HTML (code, links, bold, italic). */
const renderInline = (nodes: MinimarkNode[]): string =>
  nodes
    .map((node): string => {
      if (!isElement(node)) return escapeHtml(node)
      const [tag, props] = node
      const inner = renderInline(children(node))
      switch (tag) {
        case 'code':
          return `<span class="term-accent">${inner}</span>`
        case 'a': {
          const href = typeof props.href === 'string' ? props.href : '#'
          return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${inner}</a>`
        }
        case 'strong':
        case 'b':
          return `<b>${inner}</b>`
        case 'em':
        case 'i':
          return `<i>${inner}</i>`
        default:
          return inner
      }
    })
    .join('')

/** Block-level markdown → terminal lines. */
export function renderMarkdownToTerminal(body: unknown): TermMdLine[] {
  const value = (body as MinimarkRoot | undefined)?.value
  if (!Array.isArray(value)) return [{ type: 'muted', text: '(post body could not be parsed)' }]

  const lines: TermMdLine[] = []
  const blank = () => lines.push({ type: 'output', text: '' })

  for (const node of value) {
    if (!isElement(node)) continue
    const [tag, props] = node

    if (/^h[1-6]$/.test(tag)) {
      blank()
      const level = Number(tag[1])
      lines.push({ type: 'primary', text: `${'#'.repeat(level)} ${plainText(children(node))}` })
      continue
    }

    switch (tag) {
      case 'p':
        blank()
        lines.push({ type: 'output', text: renderInline(children(node)), html: true })
        break
      case 'pre': {
        blank()
        const language = typeof props.language === 'string' ? props.language : ''
        const code = plainText(children(node)).replace(/\n$/, '')
        lines.push({ type: 'muted', text: `\`\`\`${language}` })
        for (const codeLine of code.split('\n')) {
          lines.push({ type: 'output', text: `  ${codeLine}` })
        }
        lines.push({ type: 'muted', text: '```' })
        break
      }
      case 'ul':
      case 'ol': {
        blank()
        let index = 1
        for (const item of children(node)) {
          if (!isElement(item) || item[0] !== 'li') continue
          const marker = tag === 'ol' ? `${index++}.` : '-'
          lines.push({ type: 'output', text: `  ${marker} ${renderInline(children(item))}`, html: true })
        }
        break
      }
      case 'blockquote':
        blank()
        for (const inner of children(node)) {
          if (!isElement(inner)) continue
          lines.push({ type: 'muted', text: `> ${plainText(children(inner))}` })
        }
        break
      case 'hr':
        blank()
        lines.push({ type: 'muted', text: '---' })
        break
      // non-content nodes the markdown pipeline injects (e.g. shiki styles)
      case 'style':
      case 'script':
        break
      default:
        blank()
        lines.push({ type: 'output', text: renderInline(children(node)), html: true })
    }
  }

  return lines.slice(lines[0]?.text === '' ? 1 : 0)
}
