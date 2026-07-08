// Suggest the closest real page for a 404'd path, so the recovery shell can
// offer "did you mean /projects?". Pure — unit-tested, no Nuxt/DOM dependency.

/** Classic Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost)
    }
    prev = curr
  }
  return prev[b.length]!
}

const clean = (path: string) => path.toLowerCase().replace(/^\/+|\/+$/g, '')

export interface RouteSuggestion { route: string, distance: number }

/**
 * The closest route to `path` by edit distance on the first path segment.
 * Returns null when nothing is within `maxDistance` (default 4), so a totally
 * unrelated URL doesn't get a nonsense suggestion.
 */
export function nearestRoute(
  path: string,
  routes: string[],
  maxDistance = 4
): RouteSuggestion | null {
  const target = clean(path).split('/')[0] ?? ''
  if (!target) return null

  let best: RouteSuggestion | null = null
  for (const route of routes) {
    const name = clean(route)
    if (!name) continue
    const distance = levenshtein(target, name)
    if (!best || distance < best.distance) best = { route, distance }
  }
  return best && best.distance <= maxDistance ? best : null
}
