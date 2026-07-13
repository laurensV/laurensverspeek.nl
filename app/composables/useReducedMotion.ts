import { usePreferredReducedMotion } from '@vueuse/core'

/**
 * Reactive twin of `prefersReducedMotion()`: a computed that flips whenever
 * EITHER the OS `prefers-reduced-motion` query OR the site's manual "reduce
 * motion" switch changes. Imperative loops (setInterval-driven canvas scenes)
 * `watch` this so they start/stop live, instead of snapshotting the setting
 * once at mount and ignoring a later toggle.
 */
export function useReducedMotion() {
  const manual = useState(STATE_KEYS.reduceMotion, () => false)
  const os = usePreferredReducedMotion()
  return computed(() => manual.value || os.value === 'reduce')
}
