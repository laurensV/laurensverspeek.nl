/**
 * A stable hue (0–359) for a tag name, so every #tag wears its own tint.
 * Same string, same color — across pages, sessions and themes.
 */
export function tagHue(tag: string): number {
  let hash = 7
  for (const ch of tag.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) % 100000
  return hash % 360
}
