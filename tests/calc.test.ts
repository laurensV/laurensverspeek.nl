import { describe, it, expect } from 'vitest'
import { calcEvaluate, calcFactorial, calcBases } from '../app/utils/calc'

describe('calcEvaluate arithmetic', () => {
  it('respects operator precedence', () => {
    expect(calcEvaluate('2+3*4')).toBe(14)
  })

  it('honours parentheses', () => {
    expect(calcEvaluate('(2+3)*4')).toBe(20)
  })

  it('evaluates right-associative power', () => {
    expect(calcEvaluate('2^3^2')).toBe(512)
    expect(calcEvaluate('2^10')).toBe(1024)
  })

  it('resolves π and e constants', () => {
    expect(calcEvaluate('π')).toBeCloseTo(Math.PI)
    expect(calcEvaluate('e*2')).toBeCloseTo(Math.E * 2)
  })

  it('returns null on divide by zero', () => {
    expect(calcEvaluate('5/0')).toBeNull()
  })

  it('returns null on malformed / incomplete input', () => {
    expect(calcEvaluate('')).toBeNull()
    expect(calcEvaluate('2+')).toBeNull()
    expect(calcEvaluate('(2+3')).toBeNull()
    expect(calcEvaluate('2 3')).toBeNull()
  })
})

describe('calcEvaluate programmer mode', () => {
  it('parses hex, binary and octal literals', () => {
    expect(calcEvaluate('0xFF', 'prog')).toBe(255)
    expect(calcEvaluate('0b1010', 'prog')).toBe(10)
    expect(calcEvaluate('0o17', 'prog')).toBe(15)
  })

  it('computes bitwise AND / OR / XOR', () => {
    expect(calcEvaluate('12&10', 'prog')).toBe(8)
    expect(calcEvaluate('12|10', 'prog')).toBe(14)
    expect(calcEvaluate('12^10', 'prog')).toBe(6) // XOR, not power
  })

  it('computes shifts', () => {
    expect(calcEvaluate('1<<4', 'prog')).toBe(16)
    expect(calcEvaluate('256>>2', 'prog')).toBe(64)
  })

  it('truncates integer division', () => {
    expect(calcEvaluate('7/2', 'prog')).toBe(3)
    expect(calcEvaluate('5/0', 'prog')).toBeNull()
  })
})

describe('calcFactorial', () => {
  it('computes small factorials', () => {
    expect(calcFactorial(0)).toBe(1)
    expect(calcFactorial(5)).toBe(120)
  })

  it('rejects negatives, non-integers and overflow', () => {
    expect(calcFactorial(-1)).toBeNull()
    expect(calcFactorial(2.5)).toBeNull()
    expect(calcFactorial(200)).toBeNull()
  })
})

describe('calcBases', () => {
  it('renders positive integers in every base', () => {
    expect(calcBases(255)).toEqual({ dec: '255', hex: 'FF', bin: '11111111', oct: '377' })
  })

  it('renders negatives as 32-bit two\'s complement', () => {
    const b = calcBases(-1)
    expect(b?.dec).toBe('-1')
    expect(b?.hex).toBe('FFFFFFFF')
    expect(b?.bin).toBe('11111111111111111111111111111111')
  })

  it('returns null for non-integers and out-of-range values', () => {
    expect(calcBases(3.14)).toBeNull()
    expect(calcBases(NaN)).toBeNull()
    expect(calcBases(-(2 ** 31) - 1)).toBeNull()
    expect(calcBases(Number.MAX_SAFE_INTEGER + 2)).toBeNull()
  })
})
