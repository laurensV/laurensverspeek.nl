import { describe, it, expect } from 'vitest'
import { nearestCommand } from '~/utils/terminal/nearestCommand'

const COMMANDS = ['help', 'about', 'projects', 'blog', 'clear', 'github', 'contact', 'colorscheme']

describe('nearestCommand', () => {
  it('suggests the obvious near-miss', () => {
    expect(nearestCommand('helo', COMMANDS)).toBe('help')
    expect(nearestCommand('projcts', COMMANDS)).toBe('projects')
    expect(nearestCommand('claer', COMMANDS)).toBe('clear')
  })

  it('prefers a command the typed text is a prefix of', () => {
    expect(nearestCommand('git', COMMANDS)).toBe('github')
    expect(nearestCommand('color', COMMANDS)).toBe('colorscheme')
  })

  it('returns null when nothing is close', () => {
    expect(nearestCommand('xyzzy', COMMANDS)).toBeNull()
    expect(nearestCommand('', COMMANDS)).toBeNull()
  })
})
