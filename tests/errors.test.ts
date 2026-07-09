import { describe, it, expect } from 'vitest'
import { cmdError, shellError } from '../app/utils/terminal/errors'

describe('terminal errors', () => {
  it('formats a command error as source: message', () => {
    expect(cmdError('cat', 'no such file')).toBe('cat: no such file')
  })

  it('shell-level errors are prefixed lvsh', () => {
    expect(shellError('command not found: xyz')).toBe('lvsh: command not found: xyz')
  })
})
