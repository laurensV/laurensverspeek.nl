// Gear & tools shown on /uses — edit freely.

export interface UsesItem {
  name: string
  note?: string
  url?: string
}

export interface UsesGroup {
  group: string
  items: UsesItem[]
}

export const uses: UsesGroup[] = [
  {
    group: 'Editor & Terminal',
    items: [
      { name: 'VS Code', note: 'with Vim keybindings, because old habits die hard', url: 'https://code.visualstudio.com' },
      { name: 'JetBrains Mono', note: 'the font this whole site is set in (for code)', url: 'https://www.jetbrains.com/lp/mono/' },
      { name: 'zsh + oh-my-zsh', note: 'the real version of the fake terminal on this site' },
      { name: 'Claude Code', note: 'AI pair programmer in the terminal', url: 'https://claude.com/claude-code' }
    ]
  },
  {
    group: 'Stack',
    items: [
      { name: 'Vue 3 + Nuxt 4', note: 'my default for anything with a UI', url: 'https://nuxt.com' },
      { name: 'TypeScript', note: 'JavaScript that scales past one weekend' },
      { name: 'Node.js', note: 'backends, tooling, scripts' },
      { name: 'Rust', note: 'Solana programs and anything performance-critical', url: 'https://www.rust-lang.org' },
      { name: 'Solana', note: 'the chain Nosana runs on', url: 'https://solana.com' }
    ]
  },
  {
    group: 'Infra & Tools',
    items: [
      { name: 'Docker', note: 'every Nosana job runs in a container' },
      { name: 'GitHub Actions', note: 'CI/CD, including the deploy of this site' },
      { name: 'Linux', note: 'servers, nodes, and the occasional desktop adventure' }
    ]
  },
  {
    group: 'Hardware',
    items: [
      { name: 'Dual monitor setup', note: 'code on one, terminal + browser on the other' },
      { name: 'Mechanical keyboard', note: 'annoying my colleagues one keystroke at a time' },
      { name: 'A GPU or two', note: 'for testing Nosana nodes, definitely not for gaming' }
    ]
  }
]
