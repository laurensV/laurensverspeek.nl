// Persistence for the terminal command history: survives visits, capped at the
// last 100 entries. The restore-once guard lives here so useTerminal doesn't
// need a module-global of its own.

import { storageGetJson, storageSetJson, isStringArray } from '~/utils/safeStorage'

const HISTORY_KEY = 'lv-terminal-history'
const MAX_ENTRIES = 100
let restored = false

/**
 * Read saved history — but only the first time, so re-mounting the terminal
 * (navbar → overlay → desktop window all share one instance) never clobbers the
 * live shared state. Returns null once already restored, or off the client.
 */
export function loadHistory(): string[] | null {
  if (!import.meta.client || restored) return null
  restored = true
  return storageGetJson(HISTORY_KEY, isStringArray) ?? []
}

export function saveHistory(entries: string[]): void {
  if (!import.meta.client) return
  storageSetJson(HISTORY_KEY, entries.slice(-MAX_ENTRIES))
}

/**
 * bash-style history expansion: `!!` (last command), `!42` (1-based entry, as
 * the history command prints), `!prefix` (most recent starting with prefix).
 * Whole tokens only, expanded once — an unmatched event is an error, like bash.
 */
export function expandHistory(
  input: string,
  history: string[]
): { expanded: string, changed: boolean } | { error: string } {
  let changed = false
  const failures: string[] = []
  const expanded = input.replace(
    /(^|\s)(!(?:!|\d+|[a-zA-Z][\w-]*))(?=\s|$)/g,
    (match, lead: string, bang: string) => {
      const event = bang.slice(1)
      let hit: string | undefined
      if (event === '!') hit = history[history.length - 1]
      else if (/^\d+$/.test(event)) hit = history[Number(event) - 1]
      else hit = [...history].reverse().find((cmd) => cmd.startsWith(event))
      if (hit === undefined) {
        failures.push(`lvsh: ${bang}: event not found`)
        return match
      }
      changed = true
      return `${lead}${hit}`
    }
  )
  const failure = failures[0]
  if (failure !== undefined) return { error: failure }
  return { expanded, changed }
}
