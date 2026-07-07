<template>
  <div class="calc is-family-code">
    <div class="calc-display">
      <span class="calc-expr">{{ expr || '0' }}</span>
      <span class="calc-result">{{ preview }}</span>
    </div>
    <div class="calc-keys">
      <button v-for="key in KEYS" :key="key.label" class="calc-key" :class="key.cls" @click="press(key.label)">
        {{ key.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

// A calculator that evaluates a small arithmetic grammar itself — no eval(),
// just a tokenizer + shunting-yard so untrusted-looking input stays contained.

const KEYS = [
  { label: 'C', cls: 'is-fn' }, { label: '(', cls: 'is-fn' }, { label: ')', cls: 'is-fn' }, { label: '/', cls: 'is-op' },
  { label: '7', cls: '' }, { label: '8', cls: '' }, { label: '9', cls: '' }, { label: '*', cls: 'is-op' },
  { label: '4', cls: '' }, { label: '5', cls: '' }, { label: '6', cls: '' }, { label: '-', cls: 'is-op' },
  { label: '1', cls: '' }, { label: '2', cls: '' }, { label: '3', cls: '' }, { label: '+', cls: 'is-op' },
  { label: '0', cls: '' }, { label: '.', cls: '' }, { label: '⌫', cls: 'is-fn' }, { label: '=', cls: 'is-eq' }
]

const expr = ref('')

const tokenize = (input: string): string[] =>
  input.match(/\d+\.?\d*|[()+\-*/]/g) ?? []

// shunting-yard → RPN → evaluate. Returns null on malformed input.
const evaluate = (input: string): number | null => {
  const tokens = tokenize(input)
  if (!tokens.length) return null
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }
  const output: string[] = []
  const ops: string[] = []
  for (const token of tokens) {
    if (/\d/.test(token)) output.push(token)
    else if (token === '(') ops.push(token)
    else if (token === ')') {
      while (ops.length && ops.at(-1) !== '(') output.push(ops.pop()!)
      if (ops.at(-1) !== '(') return null
      ops.pop()
    } else {
      while (ops.length && ops.at(-1) !== '(' && prec[ops.at(-1)!]! >= prec[token]!) output.push(ops.pop()!)
      ops.push(token)
    }
  }
  while (ops.length) {
    const op = ops.pop()!
    if (op === '(') return null
    output.push(op)
  }

  const stack: number[] = []
  for (const token of output) {
    if (/\d/.test(token)) {
      stack.push(Number(token))
      continue
    }
    const b = stack.pop()
    const a = stack.pop()
    if (a === undefined || b === undefined) return null
    if (token === '+') stack.push(a + b)
    else if (token === '-') stack.push(a - b)
    else if (token === '*') stack.push(a * b)
    else if (token === '/') stack.push(b === 0 ? NaN : a / b)
  }
  const result = stack.pop()
  return result === undefined || !Number.isFinite(result) ? null : result
}

const preview = computed(() => {
  const result = evaluate(expr.value)
  return result === null ? '' : `= ${Number(result.toFixed(6))}`
})

const press = (key: string) => {
  if (key === 'C') expr.value = ''
  else if (key === '⌫') expr.value = expr.value.slice(0, -1)
  else if (key === '=') {
    const result = evaluate(expr.value)
    if (result !== null) expr.value = String(Number(result.toFixed(6)))
  } else expr.value += key
}

// keyboard support while the window is focused
useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const k = event.key
  if (/[\d+\-*/().]/.test(k) && k.length === 1) { expr.value += k; event.preventDefault() }
  else if (k === 'Enter' || k === '=') { press('='); event.preventDefault() }
  else if (k === 'Backspace') { press('⌫'); event.preventDefault() }
  else if (k === 'Escape') press('C')
})
</script>

<style scoped lang="scss">
.calc {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 14rem;
}

.calc-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  min-height: 3.2rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.25);
  border-radius: var(--bulma-radius-small);
  background-color: hsl(var(--lv-scheme-hs), 6%);
  overflow-x: auto;

  .calc-expr {
    color: hsl(var(--lv-scheme-hs), 88%);
    font-size: 1.05rem;
  }

  .calc-result {
    color: var(--bulma-primary);
    font-size: 0.78rem;
    min-height: 0.9rem;
  }
}

.calc-keys {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.35rem;
}

.calc-key {
  padding: 0.6rem 0;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  border-radius: var(--bulma-radius-small);
  background-color: hsla(var(--lv-scheme-hs), 50%, 0.08);
  color: hsl(var(--lv-scheme-hs), 88%);
  font: inherit;
  cursor: pointer;
  transition: background-color 0.12s ease;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }

  &.is-op {
    color: var(--bulma-primary);
  }

  &.is-fn {
    color: hsl(var(--lv-scheme-hs), 60%);
  }

  &.is-eq {
    background-color: hsla(var(--lv-primary-hsl), 0.2);
    color: var(--bulma-primary);
  }
}
</style>
