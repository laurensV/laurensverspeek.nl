import { describe, it, expect } from 'vitest'
import { groupCommands } from '../app/utils/terminal/helpGroups'
import type { TerminalCommand } from '~/utils/terminal/types'

const cmd = (description: string, extra: Partial<TerminalCommand> = {}): TerminalCommand =>
  ({ description, exec: () => {}, ...extra })

describe('groupCommands', () => {
  const registry: Record<string, TerminalCommand> = {
    blog: cmd('read posts'),
    ls: cmd('list files'),
    snake: cmd('game'),
    help: cmd('help'),
    secret: cmd('hidden one', { hidden: true }),
    frobnicate: cmd('uncategorized')
  }

  it('buckets commands into ordered titled sections and drops hidden ones', () => {
    const groups = groupCommands(registry)
    const titles = groups.map((g) => g.title)
    // content before files before games before system before misc
    expect(titles.indexOf('navigate & read')).toBeLessThan(titles.indexOf('your filesystem'))
    expect(titles.indexOf('games')).toBeLessThan(titles.indexOf('shell & system'))
    expect(titles.at(-1)).toBe('more')
    const names = groups.flatMap((g) => g.commands.map((c) => c.name))
    expect(names).toContain('frobnicate')
    expect(names).not.toContain('secret')
  })

  it('sorts commands alphabetically within a section', () => {
    const groups = groupCommands({ zed: cmd('z'), abc: cmd('a') })
    expect(groups[0]!.commands.map((c) => c.name)).toEqual(['abc', 'zed'])
  })
})
