import { describe, it, expect } from 'vitest'
import { jqStream, runJq } from '../app/utils/terminal/jq'

const data = {
  basics: { name: 'Laurens', profiles: [{ network: 'GitHub' }, { network: 'X' }] },
  work: [{ name: 'Nosana', keywords: ['Rust', 'TS'] }, { name: 'Effect' }],
  count: 2,
  nested: { a: { b: 42 } }
}

describe('the jq subset', () => {
  it('. is identity', () => {
    expect(jqStream('.', data)).toEqual([data])
  })

  it('accesses nested fields', () => {
    expect(jqStream('.basics.name', data)).toEqual(['Laurens'])
    expect(jqStream('.nested.a.b', data)).toEqual([42])
  })

  it('returns null for a missing object key', () => {
    expect(jqStream('.basics.age', data)).toEqual([null])
  })

  it('indexes arrays, including from the end', () => {
    expect(jqStream('.work[0].name', data)).toEqual(['Nosana'])
    expect(jqStream('.work[-1].name', data)).toEqual(['Effect'])
  })

  it('iterates arrays into a stream', () => {
    expect(jqStream('.work[].name', data)).toEqual(['Nosana', 'Effect'])
    expect(jqStream('.basics.profiles[].network', data)).toEqual(['GitHub', 'X'])
  })

  it('pipes one filter into the next', () => {
    expect(jqStream('.work | length', data)).toEqual([2])
    expect(jqStream('.basics | keys', data)).toEqual([['name', 'profiles']])
  })

  it('supports length, keys, type builtins', () => {
    expect(jqStream('.count | type', data)).toEqual(['number'])
    expect(jqStream('.work[0].keywords | length', data)).toEqual([2])
  })

  it('errors when indexing the wrong type, unless made optional', () => {
    expect(() => jqStream('.count.nope', data)).toThrow()
    expect(jqStream('.count.nope?', data)).toEqual([])
  })

  it('runJq pretty-prints and reports bad JSON / bad filters', () => {
    expect(runJq('.basics.name', JSON.stringify(data))).toEqual({ ok: true, lines: ['"Laurens"'] })
    expect(runJq('.', 'not json')).toEqual({ ok: false, error: 'jq: input is not valid JSON' })
    const broken = runJq('.count.nope', JSON.stringify(data))
    expect(broken.ok).toBe(false)
  })
})
