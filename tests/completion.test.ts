import { describe, it, expect } from 'vitest'
import { completeInput } from '~/utils/terminal/completion'
import type { TerminalCommand } from '~/utils/terminal/types'

const cmd = (extra: Partial<TerminalCommand> = {}): TerminalCommand => ({
  description: '',
  exec: () => {},
  ...extra
})

const commands: Record<string, TerminalCommand> = {
  help: cmd(),
  cat: cmd({ argCandidates: (partial) => ['TODO.md', 'notes.txt'].filter((n) => n.startsWith(partial)) }),
  cd: cmd({ argCandidates: () => ['about', 'blog', 'contact'] }),
  colorscheme: cmd({ argCandidates: () => ['amber', 'cyan', 'emerald'] })
}
const names = Object.keys(commands)

describe('completeInput', () => {
  it('returns nothing for empty input', () => {
    expect(completeInput('', names, commands)).toEqual([])
    expect(completeInput('   ', names, commands)).toEqual([])
  })

  it('completes command names, sorted, with a trailing space', () => {
    expect(completeInput('c', names, commands)).toEqual(['cat ', 'cd ', 'colorscheme '])
  })

  it('is case-insensitive on the command name', () => {
    expect(completeInput('CD', names, commands)).toEqual(['cd '])
  })

  it('completes a command argument from its candidates', () => {
    expect(completeInput('cd a', names, commands)).toEqual(['cd about'])
  })

  it('lists all candidates when the argument is empty', () => {
    expect(completeInput('cd ', names, commands)).toEqual(['cd about', 'cd blog', 'cd contact'])
  })

  it('returns nothing for a command without matching candidates', () => {
    expect(completeInput('cd zzz', names, commands)).toEqual([])
    expect(completeInput('help anything', names, commands)).toEqual([])
  })

  it('preserves the argument case (uppercase filenames complete)', () => {
    // the partial reaches argCandidates unlowered, so TODO.md is findable
    expect(completeInput('cat TO', names, commands)).toEqual(['cat TODO.md'])
    // and the command name still folds
    expect(completeInput('CAT TO', names, commands)).toEqual(['cat TODO.md'])
  })
})
