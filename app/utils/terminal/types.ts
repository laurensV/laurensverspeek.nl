import type { Ref } from 'vue'
import type { GameHandle, GameCallbacks } from '~/utils/terminalGames'

export interface TerminalLine {
  id: number
  type: 'input' | 'output' | 'error' | 'muted' | 'primary'
  text: string
  /** Render as trusted HTML — only ever set for content we author ourselves */
  html?: boolean
}

export interface TerminalCommand {
  usage?: string
  description: string
  hidden?: boolean
  /** Candidates for tab-completing this command's first argument */
  argCandidates?: () => string[]
  /** Async commands return their promise so pipes can wait for the output */
  exec: (args: string[]) => void | Promise<void>
}

export const PAGES = ['home', 'projects', 'blog', 'about', 'uses', 'now', 'cv', 'contact'] as const

/** Minimal shape of a blog post as the terminal needs it. */
export interface TerminalBlogPost {
  path: string
  title: string
  date: string
  tags?: string[] | null
  body: unknown
}

/**
 * Everything a command module gets from the terminal host. Command registries
 * are plain factories over this context, so they can live in small per-domain
 * modules instead of one giant composable.
 */
export interface TerminalContext {
  isOpen: Ref<boolean>
  lines: Ref<TerminalLine[]>
  history: Ref<string[]>
  push: (type: TerminalLine['type'], text: string, html?: boolean) => void
  out: (text: string) => void
  muted: (text: string) => void
  error: (text: string) => void
  link: (label: string, url: string) => void
  navigate: (page: string) => void
  close: () => void
  startGame: (create: (callbacks: GameCallbacks) => GameHandle) => void
  colorMode: { preference: string, value: string }
  effects: {
    matrix: Ref<boolean>
    desktop: Ref<boolean>
    train: Ref<boolean>
    bootReplay: Ref<boolean>
    party: Ref<boolean>
    toggleCrt: () => boolean
  }
  fetchPosts: () => Promise<TerminalBlogPost[]>
  /** The full merged registry — for help, secrets and aliases */
  getCommands: () => Record<string, TerminalCommand>
}
