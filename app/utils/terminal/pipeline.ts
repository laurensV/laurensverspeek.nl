// Pure helpers for the terminal's command line: environment expansion, alias
// resolution + pipe parsing, and the pipe filter stages. Kept free of Nuxt so
// they can be unit-tested directly (see tests/terminalPipeline.test.ts).

export const stripHtml = (text: string) => text.replace(/<[^>]+>/g, '')

/** Expand $VAR and ${VAR} from an environment map; unknown vars are left as-is. */
export const expandEnv = (text: string, env: Record<string, string>) =>
  text.replace(/\$\{(\w+)\}|\$(\w+)/g, (match, braced: string | undefined, bare: string | undefined) => {
    const key = braced ?? bare ?? ''
    return env[key] ?? match
  })

export interface ParsedCommandLine {
  name: string
  args: string[]
  pipeStages: string[]
}

/**
 * Split a trailing `> file` / `>> file` output redirect off a command line,
 * leaving the command (and any pipes) intact. The `>` must sit OUTSIDE quotes,
 * so `echo "a > b"` prints its literal string instead of writing a file.
 */
export function splitOutputRedirect(input: string): { command: string, file: string | null, append: boolean } {
  // find the last unquoted '>' run, scanning with quote awareness
  let quote: '"' | "'" | null = null
  let redirectAt = -1
  let append = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (quote) {
      if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === '>' && input[i - 1] === ' ') {
      redirectAt = i
      append = input[i + 1] === '>'
    }
  }
  if (redirectAt === -1) return { command: input.trim(), file: null, append: false }
  const file = input.slice(redirectAt + (append ? 2 : 1)).trim().split(/\s+/)[0] ?? ''
  if (!file) return { command: input.trim(), file: null, append: false }
  return { command: input.slice(0, redirectAt).trim(), file, append }
}

/**
 * Split a command line into command + pipe stages, resolving a leading alias.
 * Assumes env expansion already happened.
 */
export function parseCommandLine(
  input: string,
  aliases: Record<string, string>
): ParsedCommandLine {
  const [rawCommandPart = '', ...pipeStages] = input.split('|').map((part) => part.trim())
  const [firstWord = '', ...restWords] = rawCommandPart.split(/\s+/).filter(Boolean)
  const alias = aliases[firstWord.toLowerCase()]
  const commandPart = alias ? [alias, ...restWords].join(' ') : rawCommandPart
  const [name = '', ...args] = commandPart.split(/\s+/).filter(Boolean)
  return { name, args, pipeStages }
}

/**
 * Apply one pipe stage (grep/head/tail/wc/sort/uniq) to captured lines. Returns the new
 * line list, or an error string for an unknown/invalid stage. `createLine`
 * builds a fresh line (used by `wc`) so this stays generic over line shape.
 */
export function applyFilter<T extends { text: string }>(
  input: T[],
  stage: string,
  createLine: (text: string) => T
): { lines: T[] } | { error: string } {
  const [name = '', ...rest] = stage.trim().split(/\s+/).filter(Boolean)
  switch (name) {
    case 'grep': {
      // flags may be combined (-vn); everything else is the pattern
      const flags = rest.filter((token) => token.startsWith('-')).join('')
      const invert = flags.includes('v')
      const number = flags.includes('n')
      const countOnly = flags.includes('c')
      const pattern = rest.filter((token) => !token.startsWith('-')).join(' ')
      if (!pattern) return { error: 'grep: missing pattern' }
      let matches: (text: string) => boolean
      try {
        const re = new RegExp(pattern, 'i')
        matches = (text) => re.test(text)
      } catch {
        matches = (text) => text.toLowerCase().includes(pattern.toLowerCase())
      }
      const kept: { line: T, n: number }[] = []
      input.forEach((line, i) => {
        if (matches(stripHtml(line.text)) !== invert) kept.push({ line, n: i + 1 })
      })
      if (countOnly) return { lines: [createLine(String(kept.length))] }
      if (number) return { lines: kept.map(({ line, n }) => createLine(`${n}:${stripHtml(line.text)}`)) }
      return { lines: kept.map(({ line }) => line) }
    }
    case 'head':
    case 'tail': {
      const raw = rest[0] === '-n' ? rest[1] : rest[0]
      const n = Number(raw ?? 10)
      const count = Number.isFinite(n) && n > 0 ? n : 10
      return { lines: name === 'head' ? input.slice(0, count) : input.slice(-count) }
    }
    case 'wc':
      return { lines: [createLine(String(input.length))] }
    case 'sort': {
      // -r reverse, -u drop duplicates (keeping original line formatting)
      const reverse = rest.includes('-r')
      const unique = rest.includes('-u')
      let sorted = [...input].sort((a, b) => stripHtml(a.text).localeCompare(stripHtml(b.text)))
      if (reverse) sorted.reverse()
      if (unique) {
        const seen = new Set<string>()
        sorted = sorted.filter((line) => {
          const key = stripHtml(line.text)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      }
      return { lines: sorted }
    }
    case 'uniq': {
      // collapse ADJACENT duplicates; -c prefixes each with its run length
      const count = rest.includes('-c')
      const out: T[] = []
      let prevKey: string | null = null
      let run = 0
      let firstOfRun: T | null = null
      const flush = () => {
        if (firstOfRun === null) return
        out.push(count ? createLine(`${String(run).padStart(4)} ${stripHtml(firstOfRun.text)}`) : firstOfRun)
      }
      for (const line of input) {
        const key = stripHtml(line.text)
        if (key === prevKey) {
          run++
        } else {
          flush()
          prevKey = key
          run = 1
          firstOfRun = line
        }
      }
      flush()
      return { lines: out }
    }
    default:
      return { error: `lvsh: unknown filter: ${name} (pipes support grep, head, tail, wc, sort, uniq)` }
  }
}
