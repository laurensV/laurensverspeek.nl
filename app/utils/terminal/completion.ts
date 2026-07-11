import type { TerminalCommand } from '~/utils/terminal/types'

/**
 * Every completion for a terminal input, sorted so the input row can apply the
 * first and let repeated Tab cycle through the rest (zsh-style menu completion).
 * Completes command names before a space, then the command's own argument
 * candidates (pages, accents, aliases, …). Pure — no Nuxt/DOM dependency.
 */
export function completeInput(
  input: string,
  commandNames: string[],
  commands: Record<string, TerminalCommand>
): string[] {
  const raw = input.trimStart().toLowerCase()
  if (!raw) return []
  // no space yet: complete the command name itself
  if (!raw.includes(' ')) {
    return commandNames
      .filter((name) => name.startsWith(raw))
      .sort()
      .map((name) => `${name} `)
  }
  // complete the current argument from the command's own candidates
  const [name = '', ...rest] = raw.split(/\s+/)
  const partial = rest.join(' ')
  const candidates = commands[name]?.argCandidates?.(partial) ?? []
  return candidates
    .filter((candidate) => candidate.toLowerCase().startsWith(partial))
    .sort()
    .map((candidate) => `${name} ${candidate}`)
}
