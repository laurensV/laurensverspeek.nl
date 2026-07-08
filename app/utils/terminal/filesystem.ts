// A tiny persistent "home" filesystem for the terminal: a flat namespace of
// files and directories the visitor can create with mkdir/touch/echo>, read
// with cat, and remove with rm. Persisted to localStorage so it survives visits.

export interface FsNode { dir: boolean, content: string }
export type Filesystem = Record<string, FsNode>

const FS_KEY = 'lv-terminal-fs'
let restored = false

/** Restore the saved filesystem once per session (null afterwards / off-client). */
export function loadFs(): Filesystem | null {
  if (!import.meta.client || restored) return null
  restored = true
  try {
    const saved = JSON.parse(localStorage.getItem(FS_KEY) ?? '{}') as unknown
    if (!saved || typeof saved !== 'object') return {}
    const fs: Filesystem = {}
    for (const [name, node] of Object.entries(saved as Record<string, unknown>)) {
      if (node && typeof node === 'object'
        && typeof (node as FsNode).dir === 'boolean'
        && typeof (node as FsNode).content === 'string') {
        fs[name] = { dir: (node as FsNode).dir, content: (node as FsNode).content }
      }
    }
    return fs
  } catch {
    return {} // corrupted storage — start empty
  }
}

export function saveFs(fs: Filesystem): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(FS_KEY, JSON.stringify(fs))
  } catch { /* storage full or blocked */ }
}

/**
 * Split `echo` arguments into the text and an optional `> file` redirect.
 * Handles `> file` and `>file`; anything after the `>` is the target name.
 */
export function parseRedirect(args: string[]): { text: string, file: string | null } {
  const text: string[] = []
  let file: string | null = null
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '>') {
      file = args[i + 1] ?? ''
      break
    }
    if (arg.startsWith('>')) {
      file = arg.slice(1) || (args[i + 1] ?? '')
      break
    }
    text.push(arg)
  }
  return { text: text.join(' '), file: file || null }
}
