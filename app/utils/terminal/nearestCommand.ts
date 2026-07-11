import { levenshtein } from '~/utils/nearestRoute'

/**
 * The closest known command to a mistyped one, for a "did you mean?" hint.
 * Returns null when nothing is close enough (so `xyzzy` gets no nonsense
 * suggestion) — the threshold scales a little with length. Pure/tested.
 */
export function nearestCommand(typed: string, names: string[]): string | null {
  const target = typed.toLowerCase()
  if (!target) return null
  const maxDistance = target.length <= 4 ? 2 : 3

  let best: { name: string, distance: number } | null = null
  for (const name of names) {
    const distance = levenshtein(target, name.toLowerCase())
    // a command that just has the typed text as a prefix is a strong match
    const score = name.toLowerCase().startsWith(target) ? Math.min(distance, 1) : distance
    if (!best || score < best.distance) best = { name, distance: score }
  }
  return best && best.distance <= maxDistance ? best.name : null
}
