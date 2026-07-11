import { ref } from 'vue'

// Storage writes can silently fail (quota, private mode). The screenshot and
// wallpaper flows surface that themselves; for the filesystem and its
// tombstones — where a dropped write means losing the visitor's files — this
// flag flips once so the terminal and lvOS can warn instead of lying.

/** True once a persistence write has been dropped; UIs warn off it. */
export const storageDegraded = ref(false)

/** Funnel a storage write result through the health flag (returns it). */
export function reportStorageWrite(ok: boolean): boolean {
  if (!ok) storageDegraded.value = true
  return ok
}
