import type { TerminalCommand } from '~/utils/terminal/types'

/**
 * Every completion for a terminal input, sorted so the input row can apply the
 * first and let repeated Tab cycle through the rest (zsh-style menu completion).
 * Completes command names before a space, then the command's own argument
 * candidates (paths, pages, accents, aliases, …). Command names match
 * case-insensitively; the argument keeps its original case, so paths with
 * capitals (TODO.md) complete like they would in a real shell.
 * Pure — no Nuxt/DOM dependency.
 */
export function completeInput(
  input: string,
  commandNames: string[],
  commands: Record<string, TerminalCommand>
): string[] {
  const trimmed = input.trimStart()
  if (!trimmed) return []
  // no space yet: complete the command name itself
  if (!trimmed.includes(' ')) {
    const raw = trimmed.toLowerCase()
    return commandNames
      .filter((name) => name.startsWith(raw))
      .sort()
      .map((name) => `${name} `)
  }
  // complete the current argument from the command's own candidates,
  // preserving the argument's case (only the command name is folded)
  const space = trimmed.indexOf(' ')
  const name = trimmed.slice(0, space).toLowerCase()
  const partial = trimmed.slice(space + 1).trimStart()
  const candidates = commands[name]?.argCandidates?.(partial) ?? []
  return candidates
    .filter((candidate) => candidate.toLowerCase().startsWith(partial.toLowerCase()))
    .sort()
    .map((candidate) => `${name} ${candidate}`)
}
