import type { MinimarkNode, MinimarkRoot } from '~/utils/terminalMarkdown'

// Rough reading time from the rendered minimark AST (~200 wpm). A node is
// either a text string or an element tuple [tag, props, ...children].

export const countWords = (nodes: MinimarkNode[]): number =>
  nodes.reduce((sum, node) =>
    typeof node === 'string'
      ? sum + node.split(/\s+/).filter(Boolean).length
      : sum + countWords(node.slice(2) as MinimarkNode[]), 0)

export const readingTimeMinutes = (body: MinimarkRoot | undefined, wpm = 200): number =>
  Math.max(1, Math.round(countWords(body?.value ?? []) / wpm))
