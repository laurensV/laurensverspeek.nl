import { describe, it, expect } from 'vitest'
import { groupCommands, relatedCommands } from '../app/utils/terminal/helpGroups'
import type { TerminalCommand } from '~/utils/terminal/types'

const cmd = (description: string, extra: Partial<TerminalCommand> = {}): TerminalCommand =>
  ({ description, exec: () => {}, ...extra })

describe('groupCommands', () => {
  const registry: Record<string, TerminalCommand> = {
    blog: cmd('read posts', { category: 'content' }),
    ls: cmd('list files', { category: 'files' }),
    snake: cmd('game', { category: 'games' }),
    help: cmd('help', { category: 'system' }),
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

describe('relatedCommands', () => {
  it('lists visible same-category commands, excluding the command itself', () => {
    const registry: Record<string, TerminalCommand> = {
      ls: cmd('list', { category: 'files' }),
      cat: cmd('read', { category: 'files' }),
      tree: cmd('tree', { category: 'files' }),
      snake: cmd('game', { category: 'games' }),
      frobnicate: cmd('uncategorized')
    }
    expect(relatedCommands('ls', registry)).toEqual(['cat', 'tree'])
    // uncategorized commands have no SEE ALSO
    expect(relatedCommands('frobnicate', registry)).toEqual([])
  })
})
