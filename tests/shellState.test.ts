import { describe, it, expect, vi, beforeEach } from 'vitest'
import { envExtras, saveAliases, saveEnvExtras } from '../app/utils/terminal/shellState'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key)
})

beforeEach(() => store.clear())

describe('envExtras', () => {
  it('keeps user exports and drops the shell-managed builtins', () => {
    expect(envExtras({
      USER: 'laurens',
      HOME: '/home/laurens',
      PWD: '~/blog',
      SHELL: 'lvsh',
      HOST: 'laurensverspeek.nl',
      EDITOR: 'vim',
      FAVE: 'amber'
    })).toEqual({ EDITOR: 'vim', FAVE: 'amber' })
  })

  it('returns an empty record when only builtins exist', () => {
    expect(envExtras({ USER: 'x', PWD: '~' })).toEqual({})
  })
})

describe('persistence', () => {
  // loadAliases/loadEnvExtras restore only once per module instance, and this
  // suite shares the module with other tests — so assert on the write side.
  it('saveAliases persists the full record so unalias sticks', () => {
    saveAliases({ ll: 'ls' })
    expect(JSON.parse(store.get('lv-terminal-aliases')!)).toEqual({ ll: 'ls' })
  })

  it('saveEnvExtras never writes builtins', () => {
    saveEnvExtras({ USER: 'x', EDITOR: 'vim' })
    expect(JSON.parse(store.get('lv-terminal-env')!)).toEqual({ EDITOR: 'vim' })
  })
})
