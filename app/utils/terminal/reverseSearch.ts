// Pure matching for the terminal's ctrl+r reverse-i-search: what matches,
// which match the cursor lands on (newest first, cycling), and how that reads
// in the "(2/5)" position hint.

export function searchHistory(history: string[], query: string): string[] {
  if (!query) return []
  const needle = query.toLowerCase()
  return history.filter((cmd) => cmd.toLowerCase().includes(needle))
}

/** Newest match first; each ctrl+r step walks further back, wrapping around. */
export function pickMatch(matches: string[], cursor: number): string {
  if (!matches.length) return ''
  return matches[matches.length - 1 - (cursor % matches.length)] ?? ''
}

/** 1-based position of the shown match, 0 when nothing matches. */
export function matchPosition(count: number, cursor: number): number {
  return count ? (cursor % count) + 1 : 0
}
