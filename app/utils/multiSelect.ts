// Pure index-set helpers behind the Files app's multi-select: ctrl-click
// toggles membership, shift-click/shift-arrows select the contiguous range
// from the anchor. Kept out of the composable so the semantics are testable.

/** Toggle one index in a selection set (returns a new set). */
export function toggleIndex(set: ReadonlySet<number>, index: number): Set<number> {
  const next = new Set(set)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  return next
}

/** The inclusive contiguous range between the anchor and the focused index. */
export function rangeSet(anchor: number, focus: number): Set<number> {
  const out = new Set<number>()
  for (let i = Math.min(anchor, focus); i <= Math.max(anchor, focus); i++) out.add(i)
  return out
}
