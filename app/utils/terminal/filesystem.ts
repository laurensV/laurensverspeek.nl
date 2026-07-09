// A tiny persistent "home" filesystem for the terminal: a flat namespace of
// files and directories the visitor can create with mkdir/touch/echo>, read
// with cat, and remove with rm. Persisted to localStorage so it survives visits.

import { storageGetJson, storageSetJson } from '~/utils/safeStorage'

interface FsNode { dir: boolean, content: string }
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

export function saveFs(fs: Filesystem): void {
  if (!import.meta.client) return
  storageSetJson(FS_KEY, fs)
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
