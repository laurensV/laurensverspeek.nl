// Gear & tools shown on /uses — edit freely.
import type { IconName } from '~/components/AppIcon.vue'

export interface UsesItem {
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
      { name: 'JetBrains Mono', icon: 'type', note: 'the font this whole site is set in (for code)', url: 'https://www.jetbrains.com/lp/mono/' },
      { name: 'zsh + oh-my-zsh', icon: 'terminal', note: 'the real version of the fake terminal on this site' },
      { name: 'Claude Code', icon: 'sparkles', note: 'AI pair programmer in the terminal', url: 'https://claude.com/claude-code' }
    ]
  },
  {
    group: 'Stack',
    items: [
      { name: 'Vue 3 + Nuxt 4', icon: 'layers', note: 'my default for anything with a UI', url: 'https://nuxt.com' },
      { name: 'TypeScript', icon: 'braces', note: 'JavaScript that scales past one weekend' },
      { name: 'Node.js', icon: 'server', note: 'backends, tooling, scripts' },
      { name: 'Rust', icon: 'settings', note: 'Solana programs and anything performance-critical', url: 'https://www.rust-lang.org' },
      { name: 'Solana', icon: 'zap', note: 'the chain Nosana runs on', url: 'https://solana.com' }
    ]
  },
  {
    group: 'Infra & Tools',
    items: [
      { name: 'Docker', icon: 'box', note: 'every Nosana job runs in a container' },
      { name: 'GitHub Actions', icon: 'git-branch', note: 'CI/CD, including the deploy of this site' },
      { name: 'Linux', icon: 'hash', note: 'servers, nodes, and the occasional desktop adventure' }
    ]
  },
  {
    group: 'Hardware',
    items: [
      { name: 'Dual monitor setup', icon: 'monitor', note: 'code on one, terminal + browser on the other' },
      { name: 'Mechanical keyboard', icon: 'keyboard', note: 'annoying my colleagues one keystroke at a time' },
      { name: 'A GPU or two', icon: 'cpu', note: 'for testing Nosana nodes, definitely not for gaming' }
    ]
  }
]
