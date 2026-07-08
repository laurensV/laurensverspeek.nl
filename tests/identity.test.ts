import { describe, it, expect } from 'vitest'
import { sanitizeName } from '~/composables/useIdentity'

describe('sanitizeName', () => {
  it('lowercases and slugifies spaces and specials', () => {
    expect(sanitizeName('Hello World!')).toBe('hello-world')
    expect(sanitizeName('Laurens V.')).toBe('laurens-v')
  })

  it('trims surrounding whitespace and leading/trailing hyphens', () => {
    expect(sanitizeName('   spaced out   ')).toBe('spaced-out')
    expect(sanitizeName('---edgy---')).toBe('edgy')
  })

  it('keeps digits, underscores and hyphens', () => {
    expect(sanitizeName('user_42-x')).toBe('user_42-x')
  })

  it('returns an empty string when nothing survives', () => {
    expect(sanitizeName('!!!')).toBe('')
    expect(sanitizeName('   ')).toBe('')
  })

  it('caps the length at 24 characters', () => {
    expect(sanitizeName('a'.repeat(50)).length).toBe(24)
  })
})
