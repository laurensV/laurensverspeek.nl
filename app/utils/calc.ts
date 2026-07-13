// Pure calculator engine for the lvOS Calculator app: a tokenizer + shunting-yard
// evaluator (no eval()) shared by the basic, scientific and programmer modes,
// plus the base-conversion and factorial helpers the sci/programmer buttons need.
// Kept as a pure module so it can be unit-tested without booting Nuxt.

export type CalcEvalMode = 'arith' | 'prog'

// Operator precedence per mode. In 'arith' '^' is exponentiation (right-assoc);
// in 'prog' '^' is bitwise XOR (left-assoc) — modes never mix, so the symbol is
// unambiguous for whichever mode is doing the evaluating.
const PREC: Record<CalcEvalMode, Record<string, number>> = {
  arith: { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 },
  prog: { '|': 1, '^': 2, '&': 3, '<<': 4, '>>': 4, '+': 5, '-': 5, '*': 6, '/': 6 }
}

const tokenize = (input: string, mode: CalcEvalMode): string[] => {
  const re = mode === 'prog'
    ? /0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+|<<|>>|[()+\-*/&|^]/g
    : /\d+\.?\d*|π|e|[()+\-*/^]/g
  return input.match(re) ?? []
}

const toValue = (token: string): number => {
  if (token === 'π') return Math.PI
  if (token === 'e') return Math.E
  return Number(token)
}

const apply = (op: string, a: number, b: number, mode: CalcEvalMode): number => {
  if (mode === 'prog') {
    switch (op) {
      case '&': return a & b
      case '|': return a | b
      case '^': return a ^ b
      case '<<': return a << b
      case '>>': return a >> b
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b === 0 ? NaN : Math.trunc(a / b)
      default: return NaN
    }
  }
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return b === 0 ? NaN : a / b
    case '^': return Math.pow(a, b)
    default: return NaN
  }
}

// unary negation is emitted as an internal 'u-' token, right-associative and
// higher-precedence than any binary operator so it binds to the value beside it
const UNARY = 'u-'
const UNARY_PREC = 100

// Shunting-yard → RPN → evaluate. Returns null on malformed / incomplete input.
// A leading '-' (at the start, or after '(' or another operator) is unary negation,
// so negative literals and results — '-3', '±', 'NOT' — evaluate instead of failing.
export const calcEvaluate = (input: string, mode: CalcEvalMode = 'arith'): number | null => {
  const tokens = tokenize(input, mode)
  if (!tokens.length) return null
  const prec = PREC[mode]
  const output: string[] = []
  const ops: string[] = []
  let expectValue = true // a value/'('/unary is due here (start, after '(' or a binary op)

  for (const token of tokens) {
    if (token === '(') { ops.push(token); expectValue = true; continue }
    if (token === ')') {
      while (ops.length && ops.at(-1) !== '(') output.push(ops.pop()!)
      if (ops.at(-1) !== '(') return null
      ops.pop()
      expectValue = false
      continue
    }
    const p = prec[token]
    if (p !== undefined) {
      if (token === '-' && expectValue) { ops.push(UNARY); continue } // unary negation
      if (expectValue) return null // a binary op where a value was due → malformed
      const rightAssoc = mode === 'arith' && token === '^'
      let top = ops.at(-1)
      while (top !== undefined && top !== '(') {
        const tp = top === UNARY ? UNARY_PREC : prec[top]
        if (tp === undefined || tp < p || (tp === p && rightAssoc)) break
        output.push(ops.pop()!)
        top = ops.at(-1)
      }
      ops.push(token)
      expectValue = true
      continue
    }
    output.push(token) // value literal
    expectValue = false
  }

  while (ops.length) {
    const op = ops.pop()!
    if (op === '(') return null
    output.push(op)
  }

  const stack: number[] = []
  for (const token of output) {
    if (token === UNARY) {
      const a = stack.pop()
      if (a === undefined) return null
      stack.push(-a)
      continue
    }
    if (prec[token] !== undefined) {
      const b = stack.pop()
      const a = stack.pop()
      if (a === undefined || b === undefined) return null
      stack.push(apply(token, a, b, mode))
      continue
    }
    stack.push(toValue(token))
  }
  const result = stack.pop()
  if (result === undefined || stack.length > 0 || !Number.isFinite(result)) return null
  return result
}

// n! for whole n up to 170 (171! overflows to Infinity). null on invalid input.
export const calcFactorial = (n: number): number | null => {
  if (!Number.isInteger(n) || n < 0 || n > 170) return null
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

export interface BaseReadout { dec: string, hex: string, bin: string, oct: string }

// Multi-base view of an integer. Positive values up to Number.MAX_SAFE_INTEGER
// render directly; negatives render as 32-bit two's complement (int32 range only).
// Anything non-integer or out of range returns null so the UI can show "—".
export const calcBases = (value: number): BaseReadout | null => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null
  if (value >= 0) {
    if (!Number.isSafeInteger(value)) return null
    return {
      dec: value.toString(10),
      hex: value.toString(16).toUpperCase(),
      bin: value.toString(2),
      oct: value.toString(8)
    }
  }
  if (value < -(2 ** 31)) return null
  const u = value >>> 0
  return {
    dec: value.toString(10),
    hex: u.toString(16).toUpperCase(),
    bin: u.toString(2),
    oct: u.toString(8)
  }
}
