// A tiny persistent "home" filesystem for the terminal: a flat namespace of
// files and directories the visitor can create with mkdir/touch/echo>, read
// with cat, and remove with rm. Persisted to localStorage so it survives
// visits. The site's own pages live in it too, as seeded `sys` nodes (see
// utils/terminal/siteFs) — those are rebuilt fresh every visit and never
// persisted; editing one replaces it with a plain (persisted) user node.

import { storageGetJson, storageSetJson } from '~/utils/safeStorage'

export interface FsNode {
  dir: boolean
  content: string
  /** Seeded site content: refreshed each visit, protected from rm/mv */
  sys?: boolean
}
export type Filesystem = Record<string, FsNode>

const FS_KEY = 'lv-terminal-fs'
let restored = false

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/** Restore the saved filesystem once per session (null afterwards / off-client). */
export function loadFs(): Filesystem | null {
  if (!import.meta.client || restored) return null
  restored = true
  const saved = storageGetJson(FS_KEY, isRecord)
  if (!saved) return {}
  const fs: Filesystem = {}
  for (const [name, node] of Object.entries(saved)) {
    if (node && typeof node === 'object'
      && typeof (node as FsNode).dir === 'boolean'
      && typeof (node as FsNode).content === 'string') {
      fs[name] = { dir: (node as FsNode).dir, content: (node as FsNode).content }
    }
  }
  return fs
}

/** Seeded site content is rebuilt every visit — only the visitor's own files
 * (and their edits of site files, which drop the sys flag) persist. */
export const stripSysNodes = (fs: Filesystem): Filesystem =>
  Object.fromEntries(Object.entries(fs).filter(([, node]) => !node.sys))

export function saveFs(fs: Filesystem): void {
  if (!import.meta.client) return
  storageSetJson(FS_KEY, stripSysNodes(fs))
}

/**
 * Resolve a path argument against the current directory into a home-relative,
 * normalized path ('' = home). Handles `.`, `..`, leading `/` (home-absolute)
 * and `~`. Pure — the terminal's cd/ls/cat all lean on this.
 */
export function resolvePath(cwd: string, arg: string): string {
  const absolute = arg.startsWith('/') || arg === '~' || arg.startsWith('~/')
  const cleaned = arg.replace(/^~\/?/, '').replace(/^\/+/, '')
  const stack = absolute ? [] : cwd ? cwd.split('/') : []
  for (const seg of cleaned ? cleaned.split('/') : []) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') stack.pop()
    else stack.push(seg)
  }
  return stack.join('/')
}

/** The entries directly inside a directory (no deeper descendants). */
export function dirEntries(fs: Filesystem, dir: string): { name: string, dir: boolean }[] {
  const prefix = dir ? `${dir}/` : ''
  const out: { name: string, dir: boolean }[] = []
  for (const [path, node] of Object.entries(fs)) {
    if (!path.startsWith(prefix)) continue
    const rest = path.slice(prefix.length)
    if (!rest || rest.includes('/')) continue
    out.push({ name: rest, dir: node.dir })
  }
  return out
}

/**
 * Split `echo` arguments into the text and an optional `> file` redirect.
 * Handles `> file` and `>file`; anything after the `>` is the target name.
 */
/**
 * Write `content` to `name` (resolved against `cwd`), returning the new
 * filesystem or an error. `append` concatenates onto any existing file. Shared
 * by the `echo` command and shell-level `>`/`>>` output redirection.
 */
export function writeFileAt(
  files: Filesystem,
  cwd: string,
  name: string,
  content: string,
  append = false
): { files: Filesystem } | { error: string } {
  const path = resolvePath(cwd, name)
  if (!path) return { error: 'cannot write to the home directory' }
  const parent = path.split('/').slice(0, -1).join('/')
  if (parent !== '' && files[parent]?.dir !== true) return { error: `${name}: No such file or directory` }
  if (files[path]?.dir) return { error: `${name}: Is a directory` }
  const existing = files[path]
  const nextContent = append && existing ? `${existing.content}\n${content}` : content
  return { files: { ...files, [path]: { dir: false, content: nextContent } } }
}

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

/** True when an argument should be treated as a glob pattern. */
export const isGlob = (arg: string) => arg.includes('*')

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Expand a glob against the filesystem. `*` matches within one path segment
 * (shell-style), so `notes/*.txt` finds files inside notes but not deeper.
 * Returns the matching home-relative paths, sorted; empty when nothing hits.
 */
export function expandGlob(files: Filesystem, cwd: string, pattern: string): string[] {
  const resolved = resolvePath(cwd, pattern)
  const regex = new RegExp(`^${resolved.split('*').map(escapeRe).join('[^/]*')}$`)
  return Object.keys(files).filter((path) => regex.test(path)).sort()
}

/**
 * Shell-style argument expansion for the file commands: glob args become their
 * matches (home-absolute, so they resolve the same from any cwd); non-globs
 * and misses pass through untouched, like bash's default nullglob-off.
 */
export function expandFileArgs(files: Filesystem, cwd: string, args: string[]): string[] {
  return args.flatMap((arg) => {
    if (arg.startsWith('-') || !isGlob(arg)) return [arg]
    const matches = expandGlob(files, cwd, arg)
    return matches.length ? matches.map((path) => `/${path}`) : [arg]
  })
}

/**
 * A playful `ls -l` long listing for a set of entries. Directories get a d/rwx
 * perm string, files a -/rw-; size is the content byte length (dirs show a
 * nominal block size). Pure so the formatting is testable.
 */
export function formatLongListing(
  entries: { name: string, dir: boolean, size: number }[],
  date = 'Jul  9 13:37'
): string[] {
  if (!entries.length) return ['total 0']
  const width = Math.max(...entries.map((e) => String(e.size).length), 4)
  const rows = entries.map((entry) => {
    const perms = entry.dir ? 'drwxr-xr-x' : '-rw-r--r--'
    const links = entry.dir ? 2 : 1
    const size = String(entry.dir ? 4096 : entry.size).padStart(width)
    const name = entry.dir ? `${entry.name}/` : entry.name
    return `${perms} ${links} visitor visitor ${size} ${date} ${name}`
  })
  const total = entries.reduce((sum, e) => sum + (e.dir ? 4096 : e.size), 0)
  return [`total ${Math.ceil(total / 1024)}`, ...rows]
}

/**
 * Tab-completion candidates for a path argument: completes one segment at a
 * time, descending into directories the way a real shell does. `partial` is
 * whatever the visitor typed so far ('', 'bl', 'blog/', 'blog/reb', '../x').
 * Directory candidates end in '/', so another Tab keeps descending.
 */
export function pathCandidates(
  files: Filesystem,
  cwd: string,
  partial = '',
  opts: { dirsOnly?: boolean } = {}
): string[] {
  const slash = partial.lastIndexOf('/')
  const prefix = slash === -1 ? '' : partial.slice(0, slash + 1)
  const base = slash === -1 ? partial : partial.slice(slash + 1)
  const dir = prefix ? resolvePath(cwd, prefix) : cwd
  if (prefix && dir !== '' && files[dir]?.dir !== true) return []
  return dirEntries(files, dir)
    .filter((entry) => (opts.dirsOnly ? entry.dir : true))
    .filter((entry) => entry.name.startsWith(base))
    .map((entry) => `${prefix}${entry.name}${entry.dir ? '/' : ''}`)
    .sort()
}

/**
 * Rename a node in place (same directory), carrying a directory's subtree
 * along. Pure: returns the new map, or an error string when the target name
 * is invalid or already taken.
 */
export function renamePath(
  files: Filesystem,
  path: string,
  newName: string
): { files: Filesystem } | { error: string } {
  const node = files[path]
  if (!node) return { error: `no such file: ${path}` }
  const clean = newName.trim().replace(/\/+$/, '')
  if (!clean || clean.includes('/')) return { error: 'names cannot be empty or contain /' }
  const parent = path.split('/').slice(0, -1).join('/')
  const target = parent ? `${parent}/${clean}` : clean
  if (target === path) return { files }
  if (files[target]) return { error: `${clean} already exists` }
  const renamed: Filesystem = {}
  // a renamed node becomes the visitor's own (drops any seed flag — a sys
  // node wouldn't persist under its new name otherwise)
  const own = (node: FsNode): FsNode => ({ dir: node.dir, content: node.content })
  for (const [key, value] of Object.entries(files)) {
    if (key === path) renamed[target] = own(value)
    else if (key.startsWith(`${path}/`)) renamed[`${target}${key.slice(path.length)}`] = own(value)
    else renamed[key] = value
  }
  return { files: renamed }
}
