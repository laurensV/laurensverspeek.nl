// The site as a filesystem: every page becomes a real folder with real files
// in the terminal's home filesystem (blog posts as their actual markdown,
// projects/about/uses/now/contact generated from the data modules). Seeds are
// marked `sys`: rebuilt fresh every visit, never persisted, protected from rm
// — but editable. Editing writes a plain user node over the seed (an
// "override"), which persists and, for blog posts, changes the rendered post.

import type { Filesystem } from '~/utils/terminal/filesystem'
import type { MinimarkNode, MinimarkRoot } from '~/utils/terminalMarkdown'
import { profile } from '~/data/profile'
import { projects } from '~/data/projects'
import { uses } from '~/data/uses'
import { now } from '~/data/now'

/** A seed: file content, or null for a directory. */
export type SeedMap = Record<string, string | null>

// every seed ever applied this session, so rm can restore the original
// after deleting an override (module scope: shared by terminal + lvOS)
const SEED_REGISTRY = new Map<string, string | null>()

/** The original seeded content for a path (undefined = not site content). */
export const seedFor = (path: string): string | null | undefined => SEED_REGISTRY.get(path)

/** True when the node at `path` is untouched site content (protected). */
export const isSysPath = (files: Filesystem, path: string): boolean => files[path]?.sys === true

/**
 * Merge seeds into the filesystem. A seed only lands where the visitor has no
 * node of their own — an existing non-sys node is an override and wins.
 */
export function applySeeds(files: Filesystem, seeds: SeedMap): Filesystem {
  const next = { ...files }
  for (const [path, content] of Object.entries(seeds)) {
    SEED_REGISTRY.set(path, content)
    const existing = next[path]
    if (existing && !existing.sys) continue // user override wins
    next[path] = content === null
      ? { dir: true, content: '', sys: true }
      : { dir: false, content, sys: true }
  }
  return next
}

/**
 * What removing `path` should do: site dirs and untouched site files are
 * protected; removing an override restores the original seed underneath.
 */
export function removalPlan(
  files: Filesystem,
  path: string
): 'missing' | 'protected' | { restoreSeed: string | null } {
  const node = files[path]
  if (!node) return 'missing'
  if (node.sys) return 'protected'
  const seed = SEED_REGISTRY.get(path)
  return { restoreSeed: typeof seed === 'string' ? seed : null }
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
    '(this is a real file — edit it, rm it, the site will regrow it)'
  ].join('\n')

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

  // ~/now
  seeds['now'] = null
  seeds['now/now.md'] = [
    '# now',
    ...now.sections.flatMap((section) => ['', `## ${section.title}`, ...section.items.map((item) => `- ${item}`)])
  ].join('\n')

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

interface SeedablePost {
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
