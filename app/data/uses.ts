// Gear & tools shown on /uses — edit freely.
import type { IconName } from '~/utils/icons'

interface UsesItem {
  name: string
  note?: string
  url?: string
  icon?: IconName
}

export interface UsesGroup {
  group: string
  items: UsesItem[]
}

export const uses: UsesGroup[] = [
  {
    group: 'Editor & Terminal',
    items: [
      { name: 'VS Code', icon: 'code', note: 'with Vim keybindings, because old habits die hard', url: 'https://code.visualstudio.com' },
      { name: 'Ghostty', icon: 'terminal', note: 'a fast, GPU-rendered terminal I recently switched to', url: 'https://ghostty.org' },
      { name: 'zsh + oh-my-zsh', icon: 'hash', note: 'the real version of the fake terminal on this site' },
      { name: 'JetBrains Mono', icon: 'type', note: 'the mono font this whole site is set in', url: 'https://www.jetbrains.com/lp/mono/' },
      { name: 'Claude Code', icon: 'sparkles', note: 'AI pair programmer that lives in the terminal', url: 'https://claude.com/claude-code' }
    ]
  },
  {
    group: 'Stack',
    items: [
      { name: 'Vue 3 + Nuxt 4', icon: 'layers', note: 'my default for anything with a UI — including this site', url: 'https://nuxt.com' },
      { name: 'TypeScript', icon: 'braces', note: 'JavaScript that survives past one weekend' },
      { name: 'Node.js', icon: 'server', note: 'backends, tooling, and the odd build script' },
      { name: 'Rust', icon: 'settings', note: 'Solana programs and anything performance-critical', url: 'https://www.rust-lang.org' },
      { name: 'Solana', icon: 'zap', note: 'the chain Nosana runs on', url: 'https://solana.com' },
      { name: 'Vitest + Playwright', icon: 'monitor', note: 'unit + end-to-end tests, including the ones guarding this site', url: 'https://playwright.dev' }
    ]
  },
  {
    group: 'Infra & Tools',
    items: [
      { name: 'Docker', icon: 'box', note: 'every Nosana job runs in a container' },
      { name: 'GitHub Actions', icon: 'git-branch', note: 'CI/CD — lint, typecheck, tests and the deploy of this site' },
      { name: 'GitHub Pages', icon: 'globe', note: 'where this fully-static site lives' },
      { name: 'Linux', icon: 'hash', note: 'servers, nodes, and the occasional desktop adventure' }
    ]
  },
  {
    group: 'Design & Docs',
    items: [
      { name: 'Figma', icon: 'pen', note: 'wireframes before the corner brackets and scanlines', url: 'https://figma.com' },
      { name: 'Excalidraw', icon: 'layers', note: 'architecture sketches nobody else can read', url: 'https://excalidraw.com' },
      { name: 'Obsidian', icon: 'book', note: 'notes, drafts and half of these blog posts', url: 'https://obsidian.md' }
    ]
  },
  {
    group: 'Hardware',
    items: [
      { name: 'Dual monitor setup', icon: 'monitor', note: 'code on one, terminal + browser on the other' },
      { name: 'Mechanical keyboard', icon: 'keyboard', note: 'annoying my colleagues one keystroke at a time' },
      { name: 'A GPU or two', icon: 'cpu', note: 'for testing Nosana nodes — definitely not for gaming' }
    ]
  }
]
