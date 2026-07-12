// Build-time OG image generator. Writes one branded SVG per project and blog
// post (plus a default) into public/og/, so every share link gets its own
// preview card without a runtime server or a rasterizer dependency.
// Runs automatically before `nuxt generate` via the `pregenerate` npm script.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createJiti } from 'jiti'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const outDir = join(root, 'public', 'og')
mkdirSync(outDir, { recursive: true })

const jiti = createJiti(import.meta.url)
/** @type {{ projects: { slug: string, title: string, description: string }[] }} */
const { projects } = (await jiti.import(join(root, 'app/data/projects.ts')))
/** @type {{ profile: { name: string, domain: string } }} */
const { profile } = (await jiti.import(join(root, 'app/data/profile.ts')))

/** @param {unknown} text */
const escape = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// crude word-wrap into <= maxChars lines, capped at maxLines
/** @param {string} text @param {number} maxChars @param {number} maxLines */
const wrap = (text, maxChars, maxLines) => {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars) {
      lines.push(line.trim())
      line = word
      if (lines.length === maxLines - 1) break
    } else {
      line = (line + ' ' + word).trim()
    }
  }
  if (line && lines.length < maxLines) lines.push(line.trim())
  if (lines.length === maxLines) lines[maxLines - 1] += '…'
  return lines
}

/** @param {{ eyebrow: string, title: string, description: string }} data */
const card = ({ eyebrow, title, description }) => {
  const titleLines = wrap(title, 26, 3)
  const descLines = wrap(description, 58, 2)
  const titleSvg = titleLines
    .map((line, i) => `<text x="80" y="${300 + i * 74}" class="title">${escape(line)}</text>`)
    .join('')
  const descSvg = descLines
    .map((line, i) => `<text x="80" y="${330 + titleLines.length * 74 + i * 40}" class="desc">${escape(line)}</text>`)
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="78%" cy="20%" r="70%">
      <stop offset="0%" stop-color="#ffba00" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffba00" stop-opacity="0"/>
    </radialGradient>
    <style>
      .title { fill: #f5f5f5; font-family: 'Inter', system-ui, sans-serif; font-size: 62px; font-weight: 800; }
      .desc { fill: #a5a5a5; font-family: 'Inter', system-ui, sans-serif; font-size: 30px; }
      .eyebrow { fill: #ffba00; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 26px; letter-spacing: 2px; }
      .brand { fill: #f5f5f5; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 28px; font-weight: 700; }
      .domain { fill: #6f6f6f; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 24px; }
    </style>
  </defs>
  <rect width="1200" height="630" fill="#0a0a0b"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="10" height="630" fill="#ffba00"/>
  <text x="80" y="150" class="eyebrow">${escape(eyebrow)}</text>
  ${titleSvg}
  ${descSvg}
  <text x="80" y="560" class="brand">~/laurens</text>
  <text x="1120" y="560" text-anchor="end" class="domain">${escape(profile.domain)}</text>
</svg>`
}

/** @param {string} name @param {{ eyebrow: string, title: string, description: string }} data */
const writeCard = (name, data) => {
  writeFileSync(join(outDir, `${name}.svg`), card(data))
  return name
}

const written = []

// default site card
written.push(writeCard('default', {
  eyebrow: 'hello-world $',
  title: profile.name,
  description: 'Full-stack & blockchain developer — building products end to end.'
}))

// interactive-page cards
written.push(writeCard('life', {
  eyebrow: 'conway $ ./life',
  title: "Conway's Game of Life",
  description: 'A full-page, playable cellular automaton — draw cells and watch them evolve.'
}))
written.push(writeCard('desktop', {
  eyebrow: 'startx $',
  title: 'lvOS 2.0 — a desktop in the browser',
  description: 'Draggable windows, a taskbar, apps and a real terminal — the site’s operating-system easter egg.'
}))

// top-level page cards (blog posts and projects get their own below)
const PAGES = [
  ['about', 'whoami $', 'About Laurens', 'From a kid with a computer to full-stack & blockchain developer — the whole timeline.'],
  ['projects', 'ls ~/projects', 'Projects', 'Work, sides and experiments — from decentralized compute to self-coding websites.'],
  ['blog', 'ls ~/blog', 'Blog', 'Code, blockchain and website experiments, written up.'],
  ['uses', 'cat uses.txt', 'Uses', 'The gear, software and stack behind the work.'],
  ['now', 'cat now.txt', 'Now', 'What Laurens is building, learning and tinkering with right now.'],
  ['contact', './contact.sh', 'Contact', 'Run the wizard, scan the QR, or just send a plain email.'],
  ['changelog', 'git log', 'Changelog', 'The living history of this site — real commits, baked at build time.'],
  ['stats', 'cat /proc/stats', 'Stats', 'Public, cookie-free visitor counters for the whole site.'],
  ['cv', 'less resume.pdf', 'Curriculum Vitae', 'Printable resume of Laurens Verspeek.'],
  ['museum', 'tour --all', 'The Museum', 'Every feature and easter egg this site ships, catalogued like exhibits.'],
  ['418', 'BREW /pot-0', "418 — I'm a teapot", 'RFC 2324, faithfully implemented. Coffee will not be brewed.'],
  ['world', 'world $ ./place', 'The Pixel World', 'A hidden shared canvas: one pixel at a time, together.'],
  ['keyboard', 'man $ ./shortcuts', 'Keyboard reference', 'Every shortcut and trick across the site, the terminal and lvOS.']
]
for (const [slug, eyebrow, title, description] of PAGES) {
  written.push(writeCard(`page-${slug}`, { eyebrow, title, description }))
}

// per-project cards
for (const project of projects) {
  written.push(writeCard(`project-${project.slug}`, {
    eyebrow: `projects/${project.slug}`,
    title: project.title,
    description: project.description
  }))
}

// per-post cards from blog frontmatter
const blogDir = join(root, 'content', 'blog')
for (const file of readdirSync(blogDir).filter((f) => f.endsWith('.md'))) {
  const raw = readFileSync(join(blogDir, file), 'utf-8')
  const fm = /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? ''
  /** @param {string} key */
  const field = (key) => {
    const m = new RegExp(`^${key}:\\s*['"]?(.+?)['"]?\\s*$`, 'm').exec(fm)
    return m?.[1] ?? ''
  }
  const slug = file.replace(/\.md$/, '')
  written.push(writeCard(`blog-${slug}`, {
    eyebrow: `blog/${slug}`,
    title: field('title'),
    description: field('description')
  }))
}

console.log(`[og] generated ${written.length} OG images → public/og/`)
