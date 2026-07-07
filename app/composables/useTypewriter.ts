import { usePreferredReducedMotion, tryOnScopeDispose } from '@vueuse/core'

interface TypewriterOptions {
  typeMs?: number
  eraseMs?: number
  holdMs?: number
}

/**
 * Cycles through `words` with a type/erase animation.
 * Falls back to swapping whole words when the user prefers reduced motion.
 */
export function useTypewriter(words: string[], options: TypewriterOptions = {}) {
  const { typeMs = 70, eraseMs = 35, holdMs = 2000 } = options

  const text = ref('')
  const reducedMotion = usePreferredReducedMotion()

  let wordIndex = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const schedule = (fn: () => void, ms: number) => {
    timer = setTimeout(fn, ms)
  }

  const type = (chars: number) => {
    const word = words[wordIndex] ?? ''
    text.value = word.slice(0, chars)
    if (chars < word.length) {
      schedule(() => type(chars + 1), typeMs)
    } else {
      schedule(() => erase(word.length), holdMs)
    }
  }

  const erase = (chars: number) => {
    const word = words[wordIndex] ?? ''
    text.value = word.slice(0, chars)
    if (chars > 0) {
      schedule(() => erase(chars - 1), eraseMs)
    } else {
      wordIndex = (wordIndex + 1) % words.length
      schedule(() => type(1), typeMs * 4)
    }
  }

  const swap = () => {
    text.value = words[wordIndex] ?? ''
    wordIndex = (wordIndex + 1) % words.length
    schedule(swap, holdMs + 1000)
  }

  onMounted(() => {
    if (reducedMotion.value === 'reduce') swap()
    else type(1)
  })

  tryOnScopeDispose(() => clearTimeout(timer))

  return { text }
}
