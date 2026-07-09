import { describe, expect, it } from 'vitest'
import { splitChain, shouldRunNext } from '~/utils/terminal/chain'

const segmentsOf = (input: string) => {
  const result = splitChain(input)
  if ('error' in result) throw new Error(result.error)
  return result.segments
}

describe('splitChain', () => {
  it('returns a single segment when no operator is present', () => {
    expect(segmentsOf('echo hello')).toEqual([{ cmd: 'echo hello', op: null }])
  })

  it('leaves single pipes for the pipeline parser', () => {
    expect(segmentsOf('fortune | grep dev')).toEqual([{ cmd: 'fortune | grep dev', op: null }])
  })

  it('splits on && with the operator attached to the left segment', () => {
    expect(segmentsOf('mkdir demo && cd demo')).toEqual([
      { cmd: 'mkdir demo', op: '&&' },
      { cmd: 'cd demo', op: null }
    ])
  })

  it('splits on || and ; in one line', () => {
    expect(segmentsOf('nope || echo fallback; echo always')).toEqual([
      { cmd: 'nope', op: '||' },
      { cmd: 'echo fallback', op: ';' },
      { cmd: 'echo always', op: null }
    ])
  })

  it('does not split inside quotes', () => {
    expect(segmentsOf('echo "a && b" && echo c')).toEqual([
      { cmd: 'echo "a && b"', op: '&&' },
      { cmd: 'echo c', op: null }
    ])
    expect(segmentsOf("echo 'x; y'")).toEqual([{ cmd: "echo 'x; y'", op: null }])
  })

  it('allows a trailing semicolon', () => {
    expect(segmentsOf('echo hi;')).toEqual([{ cmd: 'echo hi', op: ';' }])
  })

  it('rejects dangling && and empty segments', () => {
    expect(splitChain('echo hi &&')).toEqual({ error: "lvsh: syntax error near unexpected token `&&'" })
    expect(splitChain('&& echo hi')).toEqual({ error: "lvsh: syntax error near unexpected token `&&'" })
    expect(splitChain('echo a && && echo b')).toEqual({ error: "lvsh: syntax error near unexpected token `&&'" })
    expect(splitChain(';')).toEqual({ error: "lvsh: syntax error near unexpected token `;'" })
  })
})

describe('shouldRunNext', () => {
  it('implements shell short-circuit semantics', () => {
    expect(shouldRunNext('&&', true)).toBe(true)
    expect(shouldRunNext('&&', false)).toBe(false)
    expect(shouldRunNext('||', true)).toBe(false)
    expect(shouldRunNext('||', false)).toBe(true)
    expect(shouldRunNext(';', true)).toBe(true)
    expect(shouldRunNext(';', false)).toBe(true)
  })
})
