// One place for localStorage access. Every call site used to hand-roll the
// same try/catch (private mode, quota, blocked storage) — these helpers no-op
// gracefully server-side and in locked-down browsers instead.
//
// Deliberately not @vueuse's useStorage: the app shares state via useState
// keys (one ref per key app-wide), restores lazily with validation, and wants
// write failures surfaced (the vim app's E212 hint) — none of which fit
// useStorage's eager per-call reactive refs.

export function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Returns false when the write didn't stick (quota, private mode, server). */
export function storageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch { /* already gone, or blocked */ }
}

/** Parse + validate in one go; anything corrupted or foreign becomes null. */
export function storageGetJson<T>(key: string, validate: (parsed: unknown) => parsed is T): T | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as unknown
    return validate(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function storageSetJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

/**
 * Factory reset: wipe everything this site stored in the browser (files,
 * edits, scores, pet, trash, settings, history, …) except `keep` keys —
 * the site gate stays open so a reset doesn't lock the visitor out.
 */
export function storageWipe(keep: string[] = ['lv-gate-open']): void {
  try {
    const preserved = keep
      .map((key) => [key, localStorage.getItem(key)] as const)
      .filter(([, value]) => value !== null)
    localStorage.clear()
    for (const [key, value] of preserved) localStorage.setItem(key, value!)
    sessionStorage.clear()
  } catch { /* blocked storage — nothing to wipe then */ }
}
