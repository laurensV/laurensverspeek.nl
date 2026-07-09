import type { TerminalCommand } from '~/utils/terminal/types'

// Which section each command belongs to in `help` comes from the command's
// own `category` field (see TerminalCommand) — anything undeclared still
// shows up, it just lands in "misc".

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
  commands: { name: string, usage?: string | undefined, description: string }[]
}

/** Visible commands sharing a help category with `name` — man's SEE ALSO. */
export function relatedCommands(name: string, commands: Record<string, TerminalCommand>): string[] {
  const category = commands[name]?.category
  if (!category) return []
  return Object.entries(commands)
    .filter(([other, cmd]) => other !== name && !cmd.hidden && cmd.category === category)
    .map(([other]) => other)
    .sort()
}

/** Group the visible commands into ordered, titled sections for `help`. */
export function groupCommands(commands: Record<string, TerminalCommand>): HelpGroup[] {
  const buckets = new Map<string, HelpGroup['commands']>()
  for (const [name, cmd] of Object.entries(commands)) {
    if (cmd.hidden) continue
    const key = cmd.category ?? 'misc'
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push({ name, usage: cmd.usage, description: cmd.description })
  }
  for (const list of buckets.values()) list.sort((a, b) => a.name.localeCompare(b.name))
  return ORDER
    .filter((key) => buckets.has(key))
    .map((key) => ({ title: TITLES[key]!, commands: buckets.get(key)! }))
}
