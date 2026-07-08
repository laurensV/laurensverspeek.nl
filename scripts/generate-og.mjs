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
const { projects } = await jiti.import(join(root, 'app/data/projects.ts'))
const { profile } = await jiti.import(join(root, 'app/data/profile.ts'))

const escape = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// crude word-wrap into <= maxChars lines, capped at maxLines
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
