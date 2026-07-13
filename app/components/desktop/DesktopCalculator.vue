<template>
  <div ref="rootRef" class="calc is-family-code">
    <div class="calc-modes" role="tablist" aria-label="calculator mode">
      <button
        v-for="m in MODES"
        :key="m.value"
        class="calc-mode"
        :class="{ 'is-active': mode === m.value }"
        role="tab"
        :aria-selected="mode === m.value"
        @click="setMode(m.value)"
      >
        {{ m.label }}
      </button>
    </div>

    <div class="calc-display">
      <span class="calc-expr">{{ error || expr || '0' }}</span>
      <span class="calc-result">{{ preview }}</span>
    </div>

    <div v-if="mode === 'programmer'" class="calc-bases">
      <div v-for="row in baseRows" :key="row.label" class="calc-base-row">
        <span class="calc-base-label">{{ row.label }}</span>
        <span class="calc-base-value">{{ row.value }}</span>
      </div>
    </div>

    <div v-if="mode === 'scientific'" class="calc-keys calc-keys-sci">
      <button v-for="key in SCI_KEYS" :key="key.label" class="calc-key is-sci" @click="press(key.label)">
        {{ key.label === 'ANGLE' ? angleMode : key.label }}
      </button>
    </div>

    <div v-if="mode === 'programmer'" class="calc-keys calc-keys-prog">
      <button v-for="key in PROG_KEYS" :key="key.label" class="calc-key" :class="key.cls" @click="press(key.label)">
        {{ key.label }}
      </button>
    </div>
    <div v-else class="calc-keys">
      <button v-for="key in BASIC_KEYS" :key="key.label" class="calc-key" :class="key.cls" @click="press(key.label)">
        {{ key.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import type { CalcEvalMode } from '~/utils/calc'

// A calculator that evaluates a small grammar itself — no eval(), just a
// tokenizer + shunting-yard (see ~/utils/calc) — with three modes: the original
// basic arithmetic, a scientific pad (trig, logs, roots, powers, n!, π/e), and a
// programmer pad (multi-base readout, hex entry, bitwise ops).

type Mode = 'basic' | 'scientific' | 'programmer'
interface Key { label: string, cls: string }

const MODES: { value: Mode, label: string }[] = [
  { value: 'basic', label: 'basic' },
  { value: 'scientific', label: 'sci' },
  { value: 'programmer', label: 'prog' }
]

const BASIC_KEYS: Key[] = [
  { label: 'C', cls: 'is-fn' }, { label: '(', cls: 'is-fn' }, { label: ')', cls: 'is-fn' }, { label: '/', cls: 'is-op' },
  { label: '7', cls: '' }, { label: '8', cls: '' }, { label: '9', cls: '' }, { label: '*', cls: 'is-op' },
  { label: '4', cls: '' }, { label: '5', cls: '' }, { label: '6', cls: '' }, { label: '-', cls: 'is-op' },
  { label: '1', cls: '' }, { label: '2', cls: '' }, { label: '3', cls: '' }, { label: '+', cls: 'is-op' },
  { label: '0', cls: '' }, { label: '.', cls: '' }, { label: '⌫', cls: 'is-fn' }, { label: '=', cls: 'is-eq' }
]

const SCI_KEYS: Key[] = [
  { label: 'sin', cls: '' }, { label: 'cos', cls: '' }, { label: 'tan', cls: '' }, { label: 'ANGLE', cls: 'is-fn' },
  { label: 'ln', cls: '' }, { label: 'log', cls: '' }, { label: '√', cls: '' }, { label: 'x²', cls: '' },
  { label: 'xʸ', cls: '' }, { label: 'x!', cls: '' }, { label: '1/x', cls: '' }, { label: '±', cls: '' },
  { label: 'π', cls: 'is-op' }, { label: 'e', cls: 'is-op' }, { label: '(', cls: 'is-fn' }, { label: ')', cls: 'is-fn' }
]

const PROG_KEYS: Key[] = [
  { label: 'AND', cls: 'is-op' }, { label: 'OR', cls: 'is-op' }, { label: 'XOR', cls: 'is-op' }, { label: 'NOT', cls: 'is-op' },
  { label: '<<', cls: 'is-op' }, { label: '>>', cls: 'is-op' }, { label: '(', cls: 'is-fn' }, { label: ')', cls: 'is-fn' },
  { label: 'A', cls: 'is-hex' }, { label: 'B', cls: 'is-hex' }, { label: 'C', cls: 'is-hex' }, { label: 'D', cls: 'is-hex' },
  { label: 'E', cls: 'is-hex' }, { label: 'F', cls: 'is-hex' }, { label: '±', cls: 'is-fn' }, { label: 'AC', cls: 'is-fn' },
  { label: '7', cls: '' }, { label: '8', cls: '' }, { label: '9', cls: '' }, { label: '/', cls: 'is-op' },
  { label: '4', cls: '' }, { label: '5', cls: '' }, { label: '6', cls: '' }, { label: '*', cls: 'is-op' },
  { label: '1', cls: '' }, { label: '2', cls: '' }, { label: '3', cls: '' }, { label: '-', cls: 'is-op' },
  { label: '0', cls: '' }, { label: '⌫', cls: 'is-fn' }, { label: '=', cls: 'is-eq' }, { label: '+', cls: 'is-op' }
]

const mode = ref<Mode>('basic')
const expr = ref('')
const error = ref('')
const angleMode = ref<'deg' | 'rad'>('deg')

const evalMode = (): CalcEvalMode => (mode.value === 'programmer' ? 'prog' : 'arith')
const toRad = (n: number): number => (angleMode.value === 'deg' ? (n * Math.PI) / 180 : n)

// switch modes; clear when the token grammar changes (arith ↔ prog) so leftover
// hex / π tokens can't linger in an incompatible field
const setMode = (next: Mode) => {
  const changesGrammar = (next === 'programmer') !== (mode.value === 'programmer')
  if (changesGrammar) { expr.value = ''; error.value = '' }
  mode.value = next
}

const preview = computed(() => {
  const em = evalMode()
  const result = calcEvaluate(expr.value, em)
  if (result === null) return ''
  return `= ${em === 'prog' ? result : Number(result.toFixed(6))}`
})

const baseRows = computed(() => {
  const value = expr.value ? calcEvaluate(expr.value, 'prog') : 0
  const bases = value === null ? null : calcBases(value)
  return [
    { label: 'DEC', value: bases?.dec ?? '—' },
    { label: 'HEX', value: bases ? `0x${bases.hex}` : '—' },
    { label: 'BIN', value: bases?.bin ?? '—' },
    { label: 'OCT', value: bases ? `0o${bases.oct}` : '—' }
  ]
})

// apply a scientific/immediate function to the current value; on invalid input
// (log of a non-positive, √ of a negative, n! of a fraction, …) show "err"
const applyUnary = (fn: (n: number) => number | null) => {
  const value = expr.value ? calcEvaluate(expr.value, evalMode()) : 0
  if (value === null) { error.value = 'err'; return }
  const result = fn(value)
  if (result === null || !Number.isFinite(result)) { error.value = 'err'; expr.value = ''; return }
  expr.value = String(Number(result.toFixed(10)))
}

const doEquals = () => {
  const em = evalMode()
  const result = calcEvaluate(expr.value, em)
  if (result !== null) expr.value = em === 'prog' ? String(result) : String(Number(result.toFixed(6)))
}

// hex-letter entry auto-prefixes 0x so a lone A–F still tokenizes as a hex literal
const HEX_TAIL = /0x[0-9a-fA-F]*$/
const pressHex = (digit: string) => {
  expr.value += HEX_TAIL.test(expr.value) ? digit : `0x${digit}`
}

const press = (label: string) => {
  error.value = ''
  if (mode.value === 'programmer' && /^[A-F]$/.test(label)) { pressHex(label); return }
  switch (label) {
    case 'C': case 'AC': expr.value = ''; return
    case '⌫': expr.value = expr.value.slice(0, -1); return
    case '=': doEquals(); return
    case 'ANGLE': angleMode.value = angleMode.value === 'deg' ? 'rad' : 'deg'; return
    case 'sin': applyUnary((n) => Math.sin(toRad(n))); return
    case 'cos': applyUnary((n) => Math.cos(toRad(n))); return
    case 'tan': applyUnary((n) => Math.tan(toRad(n))); return
    case 'ln': applyUnary((n) => (n > 0 ? Math.log(n) : null)); return
    case 'log': applyUnary((n) => (n > 0 ? Math.log10(n) : null)); return
    case '√': applyUnary((n) => (n >= 0 ? Math.sqrt(n) : null)); return
    case 'x²': applyUnary((n) => n * n); return
    case '1/x': applyUnary((n) => (n !== 0 ? 1 / n : null)); return
    case '±': applyUnary((n) => -n); return
    case 'x!': applyUnary(calcFactorial); return
    case 'NOT': applyUnary((n) => (Number.isInteger(n) ? ~n : null)); return
    case 'xʸ': expr.value += '^'; return
    case 'AND': expr.value += '&'; return
    case 'OR': expr.value += '|'; return
    case 'XOR': expr.value += '^'; return
    default: expr.value += label // digits, . , + - * / ( ) << >> π e
  }
}

const rootRef = ref<HTMLElement>()

// the listener is on window (so keys work without clicking a key first), but it
// must only fire when the calculator is the FRONT window and the user isn't
// typing into some other field — otherwise it swallows digits meant for Notes,
// the Run dialog, or whatever app is actually focused
const isEditableTarget = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null
  if (!node?.tagName) return false
  return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA'
    || node.tagName === 'SELECT' || node.isContentEditable
}
const isFrontWindow = (): boolean => {
  const myWin = rootRef.value?.closest<HTMLElement>('.lvos-window')
  if (!myWin) return true // not mounted in a window (shouldn't happen) → don't block
  if (myWin.classList.contains('is-minimized')) return false
  let front: HTMLElement | null = null
  let maxZ = -Infinity
  for (const w of document.querySelectorAll<HTMLElement>('.lvos-window:not(.is-minimized)')) {
    const z = Number(getComputedStyle(w).zIndex) || 0
    if (z >= maxZ) { maxZ = z; front = w }
  }
  return myWin === front
}

// keyboard support while the window is mounted
useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (isEditableTarget(event.target) || !isFrontWindow()) return
  const k = event.key
  if (k === 'Enter' || k === '=') { press('='); event.preventDefault(); return }
  if (k === 'Backspace') { press('⌫'); event.preventDefault(); return }
  if (k === 'Escape') { press(mode.value === 'programmer' ? 'AC' : 'C'); return }
  if (mode.value === 'programmer') {
    if (/^[a-fA-F]$/.test(k)) { pressHex(k.toUpperCase()); event.preventDefault(); return }
    if (/^[\d+\-*/()&|^]$/.test(k)) { expr.value += k; event.preventDefault() }
    return
  }
  if (/^[\d+\-*/().^]$/.test(k)) { expr.value += k; event.preventDefault() }
})
</script>

<style scoped lang="scss">
.calc {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 14rem;
  max-width: 22rem;
}

.calc-modes {
  display: flex;
  gap: 0.25rem;
  padding: 0.2rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  border-radius: var(--bulma-radius-small);
  background-color: hsl(var(--lv-scheme-hs), 6%);
}

.calc-mode {
  flex: 1;
  padding: 0.35rem 0;
  border: none;
  border-radius: var(--bulma-radius-small);
  background-color: transparent;
  color: hsl(var(--lv-scheme-hs), 60%);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;

  @media (pointer: coarse) {
    min-height: 2.4rem;
  }

  &:hover {
    color: hsl(var(--lv-scheme-hs), 88%);
  }

  &.is-active {
    background-color: hsla(var(--lv-primary-hsl), 0.2);
    color: var(--bulma-primary);
  }
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

.calc-bases {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  border-radius: var(--bulma-radius-small);
  background-color: hsl(var(--lv-scheme-hs), 6%);
  font-size: 0.72rem;
}

.calc-base-row {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
}

.calc-base-label {
  flex: 0 0 2.2rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}

.calc-base-value {
  flex: 1;
  overflow-x: auto;
  color: hsl(var(--lv-scheme-hs), 88%);
  white-space: nowrap;
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

  // full 44px key height for thumbs
  @media (pointer: coarse) {
    min-height: 2.8rem;
  }

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }

  &.is-op {
    color: var(--bulma-primary);
  }

  &.is-fn {
    color: hsl(var(--lv-scheme-hs), 60%);
  }

  &.is-hex {
    color: hsl(var(--lv-scheme-hs), 72%);
    font-weight: 600;
  }

  &.is-eq {
    background-color: hsla(var(--lv-primary-hsl), 0.2);
    color: var(--bulma-primary);
  }

  &.is-sci {
    padding: 0.5rem 0;
    font-size: 0.8rem;
  }
}

.calc-keys-prog .calc-key {
  padding: 0.5rem 0;
  font-size: 0.82rem;
}
</style>
