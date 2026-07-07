// Pure helpers for the terminal's command line: environment expansion, alias
// resolution + pipe parsing, and the pipe filter stages. Kept free of Nuxt so
// they can be unit-tested directly (see tests/terminalPipeline.test.ts).

export const stripHtml = (text: string) => text.replace(/<[^>]+>/g, '')

/** Expand $VAR and ${VAR} from an environment map; unknown vars are left as-is. */
export const expandEnv = (text: string, env: Record<string, string>) =>
  text.replace(/\$\{(\w+)\}|\$(\w+)/g, (match, braced, bare) => {
    const key = braced ?? bare
    return env[key] ?? match
  })

export interface ParsedCommandLine {
  name: string
  args: string[]
  pipeStages: string[]
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
 * Apply one pipe stage (grep/head/tail/wc) to captured lines. Returns the new
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
      const invert = rest[0] === '-v'
      const pattern = (invert ? rest.slice(1) : rest).join(' ')
      if (!pattern) return { error: 'grep: missing pattern' }
      let matches: (text: string) => boolean
      try {
        const re = new RegExp(pattern, 'i')
        matches = (text) => re.test(text)
      } catch {
        matches = (text) => text.toLowerCase().includes(pattern.toLowerCase())
      }
      return { lines: input.filter((line) => matches(stripHtml(line.text)) !== invert) }
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
    default:
      return { error: `lvsh: unknown filter: ${name} (pipes support grep, head, tail, wc)` }
  }
}
