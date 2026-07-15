// The site as a filesystem: every page becomes a real folder with real files
// in the terminal's home filesystem (blog posts as their actual markdown,
// projects/about/uses/contact generated from the data modules). Seeds are
// marked `sys`: rebuilt fresh every visit and never persisted. They're fully
// yours though — editing writes a plain user node over the seed (an
// "override", which persists and, for blog posts, changes the rendered post)
// and deleting one leaves a persisted tombstone so it STAYS deleted next
// visit. `reseed` (or the Settings danger zone) brings the originals back.

import type { Filesystem } from '~/utils/terminal/filesystem'
import type { MinimarkNode, MinimarkRoot } from '~/utils/terminalMarkdown'
import { storageGetJson, storageSetJson, isStringArray } from '~/utils/safeStorage'
import { reportStorageWrite } from '~/utils/terminal/storageHealth'
import { profile } from '~/data/profile'
import { projects } from '~/data/projects'
import { uses } from '~/data/uses'

/** A seed: file content, or null for a directory. */
export type SeedMap = Record<string, string | null>

// every seed ever applied this session, so reseed can restore originals
// (module scope: shared by terminal + lvOS)
const SEED_REGISTRY = new Map<string, string | null>()

/** The original seeded content for a path (undefined = not site content). */
export const seedFor = (path: string): string | null | undefined => SEED_REGISTRY.get(path)

/** True when the node at `path` is untouched site content. */
export const isSysPath = (files: Filesystem, path: string): boolean => files[path]?.sys === true

// ---- tombstones: deleted site files stay deleted across visits ----
const DELETED_KEY = 'lv-fs-deleted'
let tombstones: Set<string> | null = null
const loadTombstones = (): Set<string> => {
  tombstones ??= new Set(storageGetJson(DELETED_KEY, isStringArray) ?? [])
  return tombstones
}
const saveTombstones = () => {
  // a dropped tombstone would resurrect a deleted page next visit — surface it
  if (tombstones) reportStorageWrite(storageSetJson(DELETED_KEY, [...tombstones]))
}

// blog seeds arrive asynchronously, so a just-deleted post may not be in the
// registry yet — anything under a registered seed DIRECTORY still counts
const underSeededDir = (path: string): boolean => {
  for (const [seedPath, content] of SEED_REGISTRY) {
    if (content === null && path.startsWith(`${seedPath}/`)) return true
  }
  return false
}

/** Record deliberately deleted site paths, so seeding skips them next visit. */
export function markSeedsDeleted(paths: string[]): void {
  const deleted = loadTombstones()
  let changed = false
  for (const path of paths) {
    if ((SEED_REGISTRY.has(path) || underSeededDir(path)) && !deleted.has(path)) {
      deleted.add(path)
      changed = true
    }
  }
  if (changed) saveTombstones()
}

/** Adopt another tab's tombstone set verbatim (cross-tab sync; no re-save). */
export function adoptTombstones(paths: string[]): ReadonlySet<string> {
  tombstones = new Set(paths)
  return tombstones
}

/** Forget tombstones (a trash restore brought the paths back). */
export function unmarkSeedsDeleted(paths: string[]): void {
  const deleted = loadTombstones()
  let changed = false
  for (const path of paths) changed = deleted.delete(path) || changed
  if (changed) saveTombstones()
}

/**
 * Merge seeds into the filesystem. A seed only lands where the visitor has no
 * node of their own — an existing non-sys node is an override and wins, and a
 * tombstoned path stays deleted.
 */
export function applySeeds(
  files: Filesystem,
  seeds: SeedMap,
  deleted: ReadonlySet<string> = loadTombstones()
): Filesystem {
  const next = { ...files }
  for (const [path, content] of Object.entries(seeds)) {
    SEED_REGISTRY.set(path, content)
    if (deleted.has(path)) continue // the visitor rm'd this — respect it
    const existing = next[path]
    if (existing && !existing.sys) continue // user override wins
    next[path] = content === null
      ? { dir: true, content: '', sys: true }
      : { dir: false, content, sys: true }
  }
  return next
}

/** Any site content seeded at or under `prefix` ('' = everything)? */
export function hasSeedsUnder(prefix: string): boolean {
  if (prefix === '') return SEED_REGISTRY.size > 0
  for (const path of SEED_REGISTRY.keys()) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true
  }
  return false
}

/**
 * Bring site content back: clears tombstones and overrides at/under `prefix`
 * ('' = all site content) and re-applies those seeds. The visitor's own files
 * are untouched. Returns the new map and how many nodes actually changed.
 */
export function restoreSeeds(files: Filesystem, prefix = ''): { files: Filesystem, restored: number } {
  const deleted = loadTombstones()
  const matches = (path: string) => prefix === '' || path === prefix || path.startsWith(`${prefix}/`)
  const next = { ...files }
  let restored = 0
  let stonesChanged = false
  for (const [path, content] of SEED_REGISTRY) {
    if (!matches(path)) continue
    if (deleted.delete(path)) stonesChanged = true
    const existing = next[path]
    if (!existing || !existing.sys) restored++ // was deleted or edited
    next[path] = content === null
      ? { dir: true, content: '', sys: true }
      : { dir: false, content, sys: true }
  }
  if (stonesChanged) saveTombstones()
  return { files: next, restored }
}

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** The synchronous seeds, generated from the central data modules. */
export function siteSeeds(): SeedMap {
  const seeds: SeedMap = {}

  seeds['readme.md'] = [
    `# ${profile.name}`,
    '',
    ...profile.bio,
    '',
    ...profile.socials.map((social) => `- ${social.label.toLowerCase()}: ${social.url}`),
    '',
    `(this is a real file — edit it, rm it; 'reseed' regrows the originals)`
  ].join('\n')

  // the hero terminal on the homepage runs `cat mission.txt` — keep it honest
  seeds['mission.txt'] = 'decentralize compute, ship cool things'

  // ~/about — bio, skills, timeline
  seeds['about'] = null
  seeds['about/bio.md'] = [`# about`, '', ...profile.bio].join('\n')
  seeds['about/skills.md'] = [
    '# skills',
    ...profile.skills.flatMap((group) => ['', `## ${group.group}`, ...group.items.map((item) => `- ${item}`)])
  ].join('\n')
  seeds['about/timeline.md'] = [
    '# timeline',
    ...profile.timeline.flatMap((entry) => [
      '',
      `## ${entry.period} — ${entry.title}`,
      entry.description,
      `stack: ${entry.stack.join(', ')}`
    ])
  ].join('\n')

  // ~/projects — one markdown file per project
  seeds['projects'] = null
  for (const project of projects) {
    seeds[`projects/${project.slug}.md`] = [
      '---',
      `title: ${project.title}`,
      `category: ${project.category}`,
      ...(project.year ? [`year: ${project.year}`] : []),
      ...(project.role ? [`role: ${project.role}`] : []),
      ...(project.url ? [`url: ${project.url}`] : []),
      ...(project.source ? [`source: ${project.source}`] : []),
      '---',
      '',
      `# ${project.title}`,
      '',
      ...(project.story ?? [project.description]).flatMap((paragraph) => [paragraph, '']),
      `→ /projects/${project.slug}`
    ].join('\n')
  }

  // ~/blog exists immediately; the posts land when the async fetch resolves
  seeds['blog'] = null

  // ~/uses — one file per gear group
  seeds['uses'] = null
  for (const group of uses) {
    seeds[`uses/${slugify(group.group)}.md`] = [
      `# ${group.group}`,
      '',
      ...group.items.map((item) => `- ${item.name}${item.note ? ` — ${item.note}` : ''}${item.url ? ` (${item.url})` : ''}`)
    ].join('\n')
  }

  // ~/cv
  seeds['cv'] = null
  seeds['cv/resume.txt'] = [
    `${profile.name} — ${profile.roles[0]}`,
    profile.location,
    '',
    ...profile.timeline.map((entry) => `${entry.period}  ${entry.title}`),
    '',
    'pdf: /laurens-verspeek-resume.pdf · printable: /cv'
  ].join('\n')
  seeds['cv/resume.pdf'] = [
    '%PDF-1.7 (allegedly)',
    'this is the terminal, so you get the plain-text version: see resume.txt',
    'the real pdf lives at /laurens-verspeek-resume.pdf'
  ].join('\n')

  // ~/contact
  seeds['contact'] = null
  seeds['contact/contact.md'] = [
    '# contact',
    '',
    `- email: ${profile.email}`,
    ...profile.socials
      .filter((social) => !social.url.startsWith('mailto:'))
      .map((social) => `- ${social.label.toLowerCase()}: ${social.url}`),
    '',
    `(or run 'contact --qr' for a scannable card)`
  ].join('\n')

  return seeds
}

// ---- blog posts as markdown files ----

export interface SeedablePost {
  path: string
  title: string
  date: string
  description?: string
  tags?: string[] | null
  rawbody?: string
  body: unknown
}

const isElement = (node: MinimarkNode): node is Exclude<MinimarkNode, string> => Array.isArray(node)
const children = (node: Exclude<MinimarkNode, string>): MinimarkNode[] => node.slice(2) as MinimarkNode[]
const plainText = (nodes: MinimarkNode[]): string =>
  nodes.map((n) => (isElement(n) ? plainText(children(n)) : n)).join('')

const inlineMd = (nodes: MinimarkNode[]): string =>
  nodes.map((node): string => {
    if (!isElement(node)) return node
    const [tag, props] = node
    const inner = inlineMd(children(node))
    switch (tag) {
      case 'code': return `\`${plainText(children(node))}\``
      case 'a': return `[${inner}](${typeof props.href === 'string' ? props.href : '#'})`
      case 'strong': case 'b': return `**${inner}**`
      case 'em': case 'i': return `*${inner}*`
      default: return inner
    }
  }).join('')

/**
 * Fallback serializer: minimark AST back to readable markdown, for posts
 * without a rawbody (shouldn't happen — the collection schema requests it).
 */
export function minimarkToMarkdown(body: unknown): string {
  const value = (body as MinimarkRoot | undefined)?.value
  if (!Array.isArray(value)) return ''
  const blocks: string[] = []
  for (const node of value) {
    if (!isElement(node)) continue
    const [tag, props] = node
    if (/^h[1-6]$/.test(tag)) {
      blocks.push(`${'#'.repeat(Number(tag[1]))} ${plainText(children(node))}`)
    } else if (tag === 'p') {
      blocks.push(inlineMd(children(node)))
    } else if (tag === 'pre') {
      const language = typeof props.language === 'string' ? props.language : ''
      blocks.push(`\`\`\`${language}\n${plainText(children(node)).replace(/\n$/, '')}\n\`\`\``)
    } else if (tag === 'ul' || tag === 'ol') {
      let index = 1
      blocks.push(children(node)
        .filter((item): item is Exclude<MinimarkNode, string> => isElement(item) && item[0] === 'li')
        .map((item) => `${tag === 'ol' ? `${index++}.` : '-'} ${inlineMd(children(item))}`)
        .join('\n'))
    } else if (tag === 'blockquote') {
      blocks.push(children(node)
        .filter(isElement)
        .map((inner) => `> ${plainText(children(inner))}`)
        .join('\n'))
    } else if (tag === 'hr') {
      blocks.push('---')
    } else if (tag !== 'style' && tag !== 'script') {
      const text = inlineMd(children(node))
      if (text.trim()) blocks.push(text)
    }
  }
  return blocks.join('\n\n')
}

/** Blog posts → seeds under blog/<slug>.md, preferring the raw source. */
export function blogSeeds(posts: SeedablePost[]): SeedMap {
  const seeds: SeedMap = { blog: null }
  for (const post of posts) {
    const slug = post.path.split('/').pop() ?? post.path
    const raw = post.rawbody?.trim()
    if (raw) {
      // rawbody keeps the original file, frontmatter included
      seeds[`blog/${slug}.md`] = raw.startsWith('---')
        ? raw
        : `${frontmatter(post)}\n\n${raw}`
    } else {
      seeds[`blog/${slug}.md`] = `${frontmatter(post)}\n\n${minimarkToMarkdown(post.body)}`
    }
  }
  return seeds
}

const frontmatter = (post: SeedablePost): string => [
  '---',
  `title: ${post.title}`,
  `date: ${post.date}`,
  ...(post.description ? [`description: ${post.description}`] : []),
  ...(post.tags?.length ? [`tags: [${post.tags.join(', ')}]`] : []),
  '---'
].join('\n')
