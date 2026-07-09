import { describe, expect, it } from 'vitest'
import { analyticsEvents } from '~/utils/analyticsEvents'

describe('analyticsEvents', () => {
  it('builds terminal command events lowercased, without arguments', () => {
    expect(analyticsEvents.terminalCommand('Help')).toBe('terminal/help')
    expect(analyticsEvents.terminalCommand('GIT')).toBe('terminal/git')
  })
})
