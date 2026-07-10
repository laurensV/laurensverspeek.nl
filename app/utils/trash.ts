import type { Filesystem } from '~/utils/terminal/filesystem'

// The lvOS recycle bin's pure logic: removing a path bundles the node and its
// subtree into a restorable entry instead of destroying it. The reactive side
// (persistence, the desktop app) lives in useTrash.

export interface TrashEntry {
  id: number
  /** Display name (the removed path's last segment) */
  name: string
  /** Home-relative path the entry restores to */
  path: string
  dir: boolean
  deletedAt: number
  /** Every removed node keyed by its full path (a dir brings its subtree) */
  nodes: Record<string, { dir: boolean, content: string }>
}

/** Bundle `path` (+ subtree) out of the filesystem into a trash entry. */
export function removeToTrash(
  files: Filesystem,
  path: string,
  id: number,
  deletedAt: number
): { files: Filesystem, entry: TrashEntry } | null {
  const node = files[path]
  if (!node) return null
  const nodes: TrashEntry['nodes'] = {}
  const remaining: Filesystem = {}
  for (const [key, value] of Object.entries(files)) {
    if (key === path || key.startsWith(`${path}/`)) nodes[key] = { ...value }
    else remaining[key] = value
  }
  return {
    files: remaining,
    entry: {
      id,
      name: path.split('/').pop() ?? path,
      path,
      dir: node.dir,
      deletedAt,
      nodes
    }
  }
}

/** Put an entry's nodes back, re-creating any parent directories that vanished. */
export function restoreEntry(files: Filesystem, entry: TrashEntry): Filesystem {
  const restored: Filesystem = { ...files }
  for (const [path, node] of Object.entries(entry.nodes)) {
    const segments = path.split('/')
    for (let i = 1; i < segments.length; i++) {
      const parent = segments.slice(0, i).join('/')
      if (!restored[parent]) restored[parent] = { dir: true, content: '' }
    }
    // never clobber a file the visitor made after the delete
    if (!restored[path]) restored[path] = { ...node }
  }
  return restored
}

/** Human size of an entry's contents, for the bin's listing. */
export function entrySize(entry: TrashEntry): string {
  const bytes = Object.values(entry.nodes).reduce((sum, node) => sum + node.content.length, 0)
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export const isTrashEntries = (parsed: unknown): parsed is TrashEntry[] =>
  Array.isArray(parsed) && parsed.every((entry) => {
    if (typeof entry !== 'object' || entry === null) return false
    const candidate = entry as Record<string, unknown>
    return typeof candidate.id === 'number'
      && typeof candidate.name === 'string'
      && typeof candidate.path === 'string'
      && typeof candidate.dir === 'boolean'
      && typeof candidate.deletedAt === 'number'
      && typeof candidate.nodes === 'object' && candidate.nodes !== null
  })
