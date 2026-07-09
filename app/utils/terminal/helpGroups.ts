import type { TerminalCommand } from '~/utils/terminal/types'

// Which section each command belongs to in `help`. Anything unlisted falls
// into "misc", so new commands still show up — they just want a home here.
const CATEGORY: Record<string, string> = {
  // navigation & content
  about: 'content', projects: 'content', blog: 'content', now: 'content', uses: 'content',
  cv: 'content', contact: 'content', github: 'content', stats: 'content', search: 'content',
  changelog: 'content', open: 'content',
  // the virtual filesystem
  ls: 'files', cd: 'files', pwd: 'files', tree: 'files', cat: 'files', mkdir: 'files',
  touch: 'files', rm: 'files', cp: 'files', mv: 'files', nano: 'files', vim: 'files',
  // games & toys
  snake: 'games', tetris: 'games', 2048: 'games', hangman: 'games', pong: 'games',
  wpm: 'games', life: 'games', top: 'games', cowsay: 'toys', figlet: 'toys',
  fortune: 'toys', weather: 'toys', qr: 'toys', crt: 'toys', matrix: 'toys',
  // shell & system
  help: 'system', man: 'system', clear: 'system', history: 'system', alias: 'system',
  unalias: 'system', env: 'system', export: 'system', which: 'system', echo: 'system',
  date: 'cal', cal: 'cal', theme: 'system', colorscheme: 'system', accent: 'system',
  fontsize: 'system', neofetch: 'system', sysinfo: 'system', df: 'system', ps: 'system',
  kill: 'system', uname: 'system', whoami: 'system', nick: 'system', reboot: 'system',
  exit: 'system'
}

const ORDER = ['content', 'files', 'games', 'toys', 'system', 'cal', 'misc']
const TITLES: Record<string, string> = {
  content: 'navigate & read',
  files: 'your filesystem',
  games: 'games',
  toys: 'toys & effects',
  system: 'shell & system',
  cal: 'time',
  misc: 'more'
}

export interface HelpGroup {
  title: string
  commands: { name: string, usage?: string, description: string }[]
}

/** Group the visible commands into ordered, titled sections for `help`. */
export function groupCommands(commands: Record<string, TerminalCommand>): HelpGroup[] {
  const buckets = new Map<string, HelpGroup['commands']>()
  for (const [name, cmd] of Object.entries(commands)) {
    if (cmd.hidden) continue
    const key = CATEGORY[name] ?? 'misc'
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push({ name, usage: cmd.usage, description: cmd.description })
  }
  for (const list of buckets.values()) list.sort((a, b) => a.name.localeCompare(b.name))
  return ORDER
    .filter((key) => buckets.has(key))
    .map((key) => ({ title: TITLES[key]!, commands: buckets.get(key)! }))
}
