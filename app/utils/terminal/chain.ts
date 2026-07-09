import { shellError } from '~/utils/terminal/errors'

// Splits a command line on the shell chain operators `&&`, `||` and `;` —
// pure, so the short-circuit semantics are unit-testable. Pipes (single `|`)
// are left alone for the pipeline parser; text inside quotes is never split.

export type ChainOp = '&&' | '||' | ';'

export interface ChainSegment {
  cmd: string
  /** The operator connecting this segment to the NEXT one (null on the last) */
  op: ChainOp | null
}

/** Whether the next segment should run, given the operator before it and how
 * the previous command went. A skipped segment keeps the previous status. */
export const shouldRunNext = (op: ChainOp, prevOk: boolean) =>
  op === ';' || (op === '&&') === prevOk

export function splitChain(input: string): { error: string } | { segments: ChainSegment[] } {
  const segments: ChainSegment[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  const cut = (op: ChainOp): string | null => {
    const cmd = current.trim()
    if (!cmd) return shellError(`syntax error near unexpected token \`${op}'`)
    segments.push({ cmd, op })
    current = ''
    return null
  }

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (quote) {
      if (ch === quote) quote = null
      current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      current += ch
      continue
    }
    const pair = input.slice(i, i + 2)
    if (pair === '&&' || pair === '||') {
      const err = cut(pair)
      if (err) return { error: err }
      i++
      continue
    }
    if (ch === ';') {
      const err = cut(';')
      if (err) return { error: err }
      continue
    }
    current += ch
  }

  const last = current.trim()
  const trailing = segments.at(-1)?.op
  // a trailing `;` is legal shell; a dangling `&&` / `||` is not
  if (!last && trailing && trailing !== ';') {
    return { error: shellError(`syntax error near unexpected token \`${trailing}'`) }
  }
  if (last) segments.push({ cmd: last, op: null })
  return { segments }
}
