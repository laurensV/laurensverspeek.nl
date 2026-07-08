// Persistence for the terminal command history: survives visits, capped at the
// last 100 entries. The restore-once guard lives here so useTerminal doesn't
// need a module-global of its own.

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
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as unknown
    return Array.isArray(saved) ? saved.filter((entry): entry is string => typeof entry === 'string') : []
  } catch {
    return [] // corrupted storage — start fresh
  }
}

export function saveHistory(entries: string[]): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch { /* storage full or blocked — history stays session-only */ }
}
